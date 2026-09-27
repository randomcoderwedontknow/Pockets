import type { LocalAccount } from '@/domain/localAccount';
import type { EncryptedValue, Field, Item, ItemAttachment, Pocket, Tag, Vault } from '@/domain/types';
import { fromBase64, toBase64 } from '@/crypto/encoding';
import { getStorage } from '@/platform/storage';
import type { SecurityRecord, VaultSnapshot } from '@/platform/storage/StorageAdapter';
import { decryptString } from '@/crypto/vaultCrypto';
import { requireVaultKey } from '@/security/securityService';

export const EXPORT_FORMAT = 'pockets-export';
export const EXPORT_VERSION = 3;
export type SupportedExportVersion = 1 | 2 | 3;

export interface ExportAttachment extends ItemAttachment {
  dataBase64: string;
}

export interface PocketsExport {
  format: typeof EXPORT_FORMAT;
  version: SupportedExportVersion;
  exportedAt: string;
  decrypted: boolean;
  vault: Vault | null;
  pockets: Pocket[];
  items: Item[];
  fields: Field[];
  tags: Tag[];
  security: SecurityRecord | null;
  /** Present in v2 exports; omitted in v1. */
  localAccount?: LocalAccount | null;
  /** Present in v3 exports. */
  attachments?: ExportAttachment[];
}

export class ExportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportFormatError';
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isEncrypted(v: unknown): v is EncryptedValue {
  return isRecord(v) && (v.v === 1 || v.v === 2) && typeof v.iv === 'string' && typeof v.ct === 'string';
}

/** Strip owner-recovery escrow from exports. */
export function stripOwnerRecovery(fields: Field[]): Field[] {
  return fields.map(({ ownerRecovery: _o, ...rest }) => rest);
}

export function parseExport(raw: unknown): PocketsExport {
  if (!isRecord(raw)) throw new ExportFormatError('File is not valid JSON.');
  if (raw.format !== EXPORT_FORMAT) throw new ExportFormatError('This file is not a Pockets export.');
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) {
    throw new ExportFormatError(`Unsupported export version (${String(raw.version)}).`);
  }
  if (!Array.isArray(raw.pockets) || !Array.isArray(raw.items) || !Array.isArray(raw.fields) || !Array.isArray(raw.tags)) {
    throw new ExportFormatError('Export is missing required collections.');
  }
  return raw as unknown as PocketsExport;
}

async function buildAttachmentsExport(): Promise<ExportAttachment[]> {
  const storage = getStorage();
  const metas = await storage.listAttachments();
  const out: ExportAttachment[] = [];
  for (const meta of metas) {
    const data = await storage.getAttachmentData(meta.id);
    if (!data) continue;
    out.push({ ...meta, dataBase64: toBase64(new Uint8Array(data)) });
  }
  return out;
}

/** Encrypted export. Protected values stay as {iv, ct}. Includes the wrapped key. */
export async function buildEncryptedExport(): Promise<PocketsExport> {
  const snap = await getStorage().snapshot();
  const localAccount = await getStorage().getLocalAccount();
  const attachments = await buildAttachmentsExport();
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    decrypted: false,
    vault: snap.vault,
    pockets: snap.pockets,
    items: snap.items,
    fields: stripOwnerRecovery(snap.fields),
    tags: snap.tags,
    security: snap.security,
    localAccount,
    attachments,
  };
}

/**
 * Decrypted export. Requires the vault to be unlocked. Writes plaintext for
 * every field and drops the security record. The caller MUST have shown a
 * warning to the user.
 */
export async function buildDecryptedExport(): Promise<PocketsExport> {
  const key = requireVaultKey();
  const snap = await getStorage().snapshot();
  const fields: Field[] = [];
  for (const f of snap.fields) {
    if (f.protected && f.encrypted) {
      if (f.encrypted.v === 2) {
        fields.push(stripOwnerRecovery([{ ...f, value: null, encrypted: f.encrypted }])[0]!);
      } else {
        const value = await decryptString(key, f.encrypted);
        fields.push({ ...f, protected: false, value, encrypted: null });
      }
    } else {
      fields.push({ ...f, protected: false, encrypted: null });
    }
  }
  const attachments = await buildAttachmentsExport();
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    decrypted: true,
    vault: snap.vault,
    pockets: snap.pockets,
    items: snap.items.map((i) => ({ ...i, protected: false })),
    fields: stripOwnerRecovery(fields),
    tags: snap.tags,
    security: null,
    attachments,
  };
}

/**
 * Confirm that an encrypted export does not contain plaintext that matches
 * any currently-known protected value. Used by tests; the implementation
 * never writes those values in the first place.
 */
export function exportContainsPlaintext(exp: PocketsExport, needles: string[]): boolean {
  if (needles.length === 0) return false;
  const hay = JSON.stringify(exp);
  return needles.some((n) => n.length > 0 && hay.includes(n));
}

async function importAttachments(list: ExportAttachment[] | undefined): Promise<void> {
  if (!list?.length) return;
  const storage = getStorage();
  for (const row of list) {
    const { dataBase64, ...meta } = row;
    const data = fromBase64(dataBase64);
    await storage.putAttachment(meta, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
}

export async function importSnapshot(exp: PocketsExport, mode: 'replace' | 'merge'): Promise<void> {
  const parsed = parseExport(exp);
  const storage = getStorage();
  const fields = stripOwnerRecovery(parsed.fields);
  if (mode === 'replace') {
    const snap: VaultSnapshot = {
      vault: parsed.vault,
      pockets: parsed.pockets,
      items: parsed.items,
      fields,
      tags: parsed.tags,
      attachments: (parsed.attachments ?? []).map(({ dataBase64: _d, ...m }) => m),
      security: parsed.security,
    };
    await storage.restore(snap);
    await importAttachments(parsed.attachments);
    if (parsed.localAccount) await storage.putLocalAccount(parsed.localAccount);
    return;
  }

  const current = await storage.snapshot();
  const pocketIds = new Set(current.pockets.map((p) => p.id));
  const itemIds = new Set(current.items.map((i) => i.id));
  const fieldIds = new Set(current.fields.map((f) => f.id));
  const tagIds = new Set(current.tags.map((t) => t.id));
  const attIds = new Set((current.attachments ?? []).map((a) => a.id));

  const next: VaultSnapshot = {
    vault: current.vault ?? parsed.vault,
    pockets: [...current.pockets],
    items: [...current.items],
    fields: [...current.fields],
    tags: [...current.tags],
    attachments: [...(current.attachments ?? [])],
    security: current.security ?? parsed.security,
  };

  for (const p of parsed.pockets) if (!pocketIds.has(p.id)) next.pockets.push(p);
  for (const i of parsed.items) if (!itemIds.has(i.id)) next.items.push(i);
  for (const f of fields) if (!fieldIds.has(f.id)) next.fields.push(f);
  for (const t of parsed.tags) if (!tagIds.has(t.id)) next.tags.push(t);
  const newAttachments: ExportAttachment[] = [];
  for (const a of parsed.attachments ?? []) {
    if (!attIds.has(a.id)) {
      const { dataBase64, ...meta } = a;
      next.attachments.push(meta);
      newAttachments.push(a);
    }
  }

  await storage.restore(next);
  await importAttachments(newAttachments);
  if (parsed.localAccount) await storage.putLocalAccount(parsed.localAccount);
}

/** Used by tests to verify ciphertext is well-formed. */
export function fieldIsCiphertextOnly(f: Field): boolean {
  if (!f.protected) return f.encrypted === null;
  return f.value === null && isEncrypted(f.encrypted) && (f.encrypted.v === 1 || f.encrypted.v === 2);
}
