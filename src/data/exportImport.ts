import type { LocalAccount } from '@/domain/localAccount';
import type { EncryptedValue, Field, Item, Pocket, Tag, Vault } from '@/domain/types';
import { getStorage } from '@/platform/storage';
import type { SecurityRecord, VaultSnapshot } from '@/platform/storage/StorageAdapter';
import { decryptString } from '@/crypto/vaultCrypto';
import { requireVaultKey } from '@/security/securityService';

export const EXPORT_FORMAT = 'pockets-export';
export const EXPORT_VERSION = 2;
export type SupportedExportVersion = 1 | 2;

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

export function parseExport(raw: unknown): PocketsExport {
  if (!isRecord(raw)) throw new ExportFormatError('File is not valid JSON.');
  if (raw.format !== EXPORT_FORMAT) throw new ExportFormatError('This file is not a Pockets export.');
  if (raw.version !== 1 && raw.version !== 2) {
    throw new ExportFormatError(`Unsupported export version (${String(raw.version)}).`);
  }
  if (!Array.isArray(raw.pockets) || !Array.isArray(raw.items) || !Array.isArray(raw.fields) || !Array.isArray(raw.tags)) {
    throw new ExportFormatError('Export is missing required collections.');
  }
  return raw as unknown as PocketsExport;
}

/** Encrypted export. Protected values stay as {iv, ct}. Includes the wrapped key. */
export async function buildEncryptedExport(): Promise<PocketsExport> {
  const snap = await getStorage().snapshot();
  const localAccount = await getStorage().getLocalAccount();
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    decrypted: false,
    ...snap,
    localAccount,
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
      const value = await decryptString(key, f.encrypted);
      fields.push({ ...f, protected: false, value, encrypted: null });
    } else {
      fields.push({ ...f, protected: false, encrypted: null });
    }
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    decrypted: true,
    vault: snap.vault,
    pockets: snap.pockets,
    items: snap.items.map((i) => ({ ...i, protected: false })),
    fields,
    tags: snap.tags,
    security: null,
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

export async function importSnapshot(exp: PocketsExport, mode: 'replace' | 'merge'): Promise<void> {
  const parsed = parseExport(exp);
  const storage = getStorage();
  if (mode === 'replace') {
    const snap: VaultSnapshot = {
      vault: parsed.vault,
      pockets: parsed.pockets,
      items: parsed.items,
      fields: parsed.fields,
      tags: parsed.tags,
      security: parsed.security,
    };
    await storage.restore(snap);
    if (parsed.localAccount) await storage.putLocalAccount(parsed.localAccount);
    return;
  }

  const current = await storage.snapshot();
  const pocketIds = new Set(current.pockets.map((p) => p.id));
  const itemIds = new Set(current.items.map((i) => i.id));
  const fieldIds = new Set(current.fields.map((f) => f.id));
  const tagIds = new Set(current.tags.map((t) => t.id));

  const next: VaultSnapshot = {
    vault: current.vault ?? parsed.vault,
    pockets: [...current.pockets],
    items: [...current.items],
    fields: [...current.fields],
    tags: [...current.tags],
    security: current.security ?? parsed.security,
  };

  for (const p of parsed.pockets) if (!pocketIds.has(p.id)) next.pockets.push(p);
  for (const i of parsed.items) if (!itemIds.has(i.id)) next.items.push(i);
  for (const f of parsed.fields) if (!fieldIds.has(f.id)) next.fields.push(f);
  for (const t of parsed.tags) if (!tagIds.has(t.id)) next.tags.push(t);

  await storage.restore(next);
  if (parsed.localAccount) await storage.putLocalAccount(parsed.localAccount);
}

/** Used by tests to verify ciphertext is well-formed. */
export function fieldIsCiphertextOnly(f: Field): boolean {
  if (!f.protected) return f.encrypted === null;
  return f.value === null && isEncrypted(f.encrypted) && (f.encrypted.v === 1 || f.encrypted.v === 2);
}
