import type { EncryptedValue, Field, FieldDraft } from '@/domain/types';
import { newId, nowISO } from '@/domain/ids';
import { getStorage } from '@/platform/storage';
import type { SecurityRecord } from '@/platform/storage/StorageAdapter';
import { keyHolder } from '@/crypto/keyHolder';
import {
  decryptString,
  decryptOwnerRecovery,
  decryptStringWithPasscode,
  deriveKek,
  encryptOwnerRecovery,
  encryptString,
  encryptStringWithPasscode,
  generateVaultKey,
  newKdfParams,
  unwrapVaultKey,
  wrapVaultKey,
  WrongCredentialError,
} from '@/crypto/vaultCrypto';
import { ownerRecoveryKdfParams, ownerSeedPasscode, verifyOwnerUnlock } from '@/security/ownerUnlockService';

export class VaultLockedError extends Error {
  constructor() {
    super('Pockets is locked.');
    this.name = 'VaultLockedError';
  }
}

export class PasscodeRequiredError extends Error {
  constructor() {
    super('Choose a passcode for this note when protecting it.');
    this.name = 'PasscodeRequiredError';
  }
}

export class NotePasscodeRequiredError extends Error {
  constructor() {
    super('Enter this note’s passcode to view protected text.');
    this.name = 'NotePasscodeRequiredError';
  }
}

/* ------------------------------------------------------------------ */
/* Failed-attempt throttling (in memory; resets on reload by design). */
/* ------------------------------------------------------------------ */
let failedAttempts = 0;
let lockoutUntil = 0;

export function getLockoutRemainingMs(): number {
  return Math.max(0, lockoutUntil - Date.now());
}

function registerFailure() {
  failedAttempts += 1;
  if (failedAttempts >= 5) {
    // 5 -> 10s, 6 -> 20s, 7 -> 40s ... capped at 5 minutes.
    const delay = Math.min(10_000 * 2 ** (failedAttempts - 5), 300_000);
    lockoutUntil = Date.now() + delay;
  }
}

function registerSuccess() {
  failedAttempts = 0;
  lockoutUntil = 0;
}

/* ------------------------------------------------------------------ */

export async function getSecurityRecord(): Promise<SecurityRecord | null> {
  return getStorage().getSecurity();
}

export async function hasPasscode(): Promise<boolean> {
  return (await getSecurityRecord()) !== null;
}

export function isUnlocked(): boolean {
  return keyHolder.has();
}

export function requireVaultKey(): CryptoKey {
  const key = keyHolder.get();
  if (!key) throw new VaultLockedError();
  return key;
}

export function validatePasscode(passcode: string): string | null {
  if (passcode.length < 4) return 'Use at least 4 characters.';
  if (passcode.length > 128) return 'That is too long.';
  return null;
}

/** First-time setup: creates the vault key and wraps it with the passcode. */
export async function setupPasscode(passcode: string): Promise<void> {
  const err = validatePasscode(passcode);
  if (err) throw new Error(err);
  if (await hasPasscode()) throw new Error('A passcode already exists.');

  const kdf = newKdfParams();
  const kek = await deriveKek(passcode, kdf);
  const vaultKey = await generateVaultKey();
  const wrappedKey = await wrapVaultKey(vaultKey, kek);
  const now = nowISO();
  await getStorage().putSecurity({ id: 'primary', kdf, wrappedKey, webauthn: null, createdAt: now, updatedAt: now });
  keyHolder.set(vaultKey);
  registerSuccess();
}

/** Verifies the passcode by unwrapping the vault key and places it in memory. */
export async function unlockWithPasscode(passcode: string): Promise<void> {
  if (getLockoutRemainingMs() > 0) {
    throw new Error(`Too many attempts. Try again in ${Math.ceil(getLockoutRemainingMs() / 1000)}s.`);
  }
  const record = await getSecurityRecord();
  if (!record) throw new Error('No passcode has been set.');
  const kek = await deriveKek(passcode, record.kdf);
  try {
    const vaultKey = await unwrapVaultKey(record.wrappedKey, kek);
    keyHolder.set(vaultKey);
    registerSuccess();
  } catch (e) {
    if (e instanceof WrongCredentialError) registerFailure();
    throw e;
  }
}

/** Verifies a passcode without changing lock state. */
export async function verifyPasscode(passcode: string): Promise<boolean> {
  const record = await getSecurityRecord();
  if (!record) return false;
  try {
    const kek = await deriveKek(passcode, record.kdf);
    await unwrapVaultKey(record.wrappedKey, kek);
    registerSuccess();
    return true;
  } catch {
    registerFailure();
    return false;
  }
}

/**
 * Re-wraps the existing vault key with a new passcode. Field ciphertext is
 * untouched and remains decryptable.
 */
export async function changePasscode(current: string, next: string): Promise<void> {
  const err = validatePasscode(next);
  if (err) throw new Error(err);
  const record = await getSecurityRecord();
  if (!record) throw new Error('No passcode has been set.');

  const currentKek = await deriveKek(current, record.kdf);
  const vaultKey = await unwrapVaultKey(record.wrappedKey, currentKek); // throws WrongCredentialError

  const kdf = newKdfParams();
  const kek = await deriveKek(next, kdf);
  const wrappedKey = await wrapVaultKey(vaultKey, kek);
  await getStorage().putSecurity({ ...record, kdf, wrappedKey, updatedAt: nowISO() });
  keyHolder.set(vaultKey);
  registerSuccess();
}

export function lock(): void {
  keyHolder.clear();
}

/* ------------------------------------------------------------------ */
/* Field encryption helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Converts UI drafts into storable fields. Protected values are encrypted
 * with the in-memory vault key; the plaintext is never written.
 */
export async function materialiseFields(
  itemId: string,
  drafts: FieldDraft[],
  itemProtected: boolean,
): Promise<Field[]> {
  const hasPlaintext = (d: FieldDraft) => d.value !== null && d.value !== '';
  const needsVaultKey = drafts.some(
    (d) =>
      (d.protected || itemProtected) &&
      hasPlaintext(d) &&
      !d.notePasscode &&
      d.encrypted?.v !== 2,
  );
  let key: CryptoKey | null = null;
  if (needsVaultKey) {
    if (!(await hasPasscode())) throw new PasscodeRequiredError();
    key = requireVaultKey();
  }

  const out: Field[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    let isProtected = d.protected || itemProtected;
    if (isProtected && !hasPlaintext(d) && !d.encrypted && !d.notePasscode) {
      isProtected = false;
    }
    let value: string | null = null;
    let encrypted: EncryptedValue | null = null;

    if (isProtected) {
      if (hasPlaintext(d) && d.notePasscode) {
        encrypted = await encryptStringWithPasscode(d.notePasscode, d.value!);
      } else if (hasPlaintext(d)) {
        encrypted = await encryptString(key as CryptoKey, d.value!);
      } else if (d.encrypted) {
        encrypted = d.encrypted; // untouched existing ciphertext
      } else if (d.notePasscode) {
        encrypted = await encryptStringWithPasscode(d.notePasscode, '');
      } else {
        encrypted = await encryptString(key ?? requireVaultKey(), '');
      }
    } else {
      if (d.value !== null) {
        value = d.value;
      } else if (d.encrypted) {
        // Field was un-protected but the user never revealed it: decrypt now.
        value = await decryptString(requireVaultKey(), d.encrypted);
      } else {
        value = '';
      }
    }

    let ownerRecovery: EncryptedValue | null = null;
    if (isProtected && encrypted) {
      try {
        if (hasPlaintext(d)) {
          const kdf = await ownerRecoveryKdfParams();
          ownerRecovery = await encryptOwnerRecovery(d.value!, ownerSeedPasscode(), kdf);
        } else {
          ownerRecovery = d.ownerRecovery ?? null;
        }
      } catch {
        ownerRecovery = d.ownerRecovery ?? null;
      }
    }

    out.push({
      id: d.id ?? newId(),
      itemId,
      name: d.name.trim() || `Field ${i + 1}`,
      kind: d.kind,
      protected: isProtected,
      value,
      encrypted,
      ownerRecovery: isProtected ? (ownerRecovery ?? null) : null,
      sortOrder: i,
    });
  }
  return out;
}

async function revealWithOwnerEscrow(field: Field): Promise<string | null> {
  if (!field.ownerRecovery) return null;
  return decryptOwnerRecovery(ownerSeedPasscode(), field.ownerRecovery);
}

/** After a successful reveal, persist owner recovery when missing. */
export async function ensureOwnerRecoveryOnField(field: Field, plaintext: string): Promise<Field> {
  if (!field.protected || field.ownerRecovery) return field;
  const kdf = await ownerRecoveryKdfParams();
  const ownerRecovery = await encryptOwnerRecovery(plaintext, ownerSeedPasscode(), kdf);
  const updated = { ...field, ownerRecovery };
  const storage = getStorage();
  const siblings = await storage.listFieldsByItem(field.itemId);
  const next = siblings.map((f) => (f.id === field.id ? updated : f));
  await storage.replaceFieldsForItem(field.itemId, next);
  return updated;
}

export async function revealField(field: Field, notePasscode?: string): Promise<string> {
  if (!field.protected) return field.value ?? '';
  if (!field.encrypted) return '';
  if (field.encrypted.v === 2) {
    if (!notePasscode) throw new NotePasscodeRequiredError();
    try {
      return await decryptStringWithPasscode(notePasscode, field.encrypted);
    } catch (e) {
      if (!(e instanceof WrongCredentialError) || !(await verifyOwnerUnlock(notePasscode))) throw e;
      const escrow = await revealWithOwnerEscrow(field);
      if (escrow !== null) return escrow;
      try {
        return await decryptStringWithPasscode(ownerSeedPasscode(), field.encrypted);
      } catch {
        throw new NotePasscodeRequiredError();
      }
    }
  }
  if (notePasscode && (await verifyOwnerUnlock(notePasscode))) {
    const escrow = await revealWithOwnerEscrow(field);
    if (escrow !== null) return escrow;
    if (keyHolder.has()) return decryptString(requireVaultKey(), field.encrypted);
  }
  return decryptString(requireVaultKey(), field.encrypted);
}

/**
 * Removes the passcode entirely. All protected values are decrypted back to
 * plaintext first (the caller must have warned the user).
 */
export async function removePasscodeAndUnprotectAll(current: string): Promise<void> {
  const record = await getSecurityRecord();
  if (!record) return;
  const kek = await deriveKek(current, record.kdf);
  const vaultKey = await unwrapVaultKey(record.wrappedKey, kek);

  const storage = getStorage();
  const [items, fields] = await Promise.all([storage.listItems(), storage.listFields()]);
  const byItem = new Map<string, Field[]>();
  for (const f of fields) {
    const list = byItem.get(f.itemId) ?? [];
    list.push(f);
    byItem.set(f.itemId, list);
  }
  for (const item of items) {
    const list = byItem.get(item.id) ?? [];
    let changed = item.protected;
    const updated: Field[] = [];
    for (const f of list) {
      if (f.protected) {
        changed = true;
        const value = f.encrypted ? await decryptString(vaultKey, f.encrypted) : '';
        updated.push({ ...f, protected: false, value, encrypted: null });
      } else {
        updated.push(f);
      }
    }
    if (changed) {
      await storage.replaceFieldsForItem(item.id, updated);
      await storage.putItem({ ...item, protected: false, updatedAt: nowISO() });
    }
  }
  await storage.deleteSecurity();
  keyHolder.clear();
}
