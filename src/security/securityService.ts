import type { EncryptedValue, Field, FieldDraft } from '@/domain/types';
import { newId, nowISO } from '@/domain/ids';
import { getStorage } from '@/platform/storage';
import type { SecurityRecord } from '@/platform/storage/StorageAdapter';
import { keyHolder } from '@/crypto/keyHolder';
import {
  decryptString,
  deriveKek,
  encryptString,
  encryptStringWithPasscode,
  decryptStringWithPasscode,
  generateVaultKey,
  newKdfParams,
  unwrapVaultKey,
  wrapVaultKey,
  WrongCredentialError,
} from '@/crypto/vaultCrypto';

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
  const needsVaultKey = drafts.some(
    (d) => (d.protected || itemProtected) && d.value !== null && !d.notePasscode && d.encrypted?.v !== 2,
  );
  let key: CryptoKey | null = null;
  if (needsVaultKey) {
    if (!(await hasPasscode())) throw new PasscodeRequiredError();
    key = requireVaultKey();
  }

  const out: Field[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const isProtected = d.protected || itemProtected;
    let value: string | null = null;
    let encrypted: EncryptedValue | null = null;

    if (isProtected) {
      if (d.value !== null && d.notePasscode) {
        encrypted = await encryptStringWithPasscode(d.notePasscode, d.value);
      } else if (d.value !== null) {
        encrypted = await encryptString(key as CryptoKey, d.value);
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

    out.push({
      id: d.id ?? newId(),
      itemId,
      name: d.name.trim() || `Field ${i + 1}`,
      kind: d.kind,
      protected: isProtected,
      value,
      encrypted,
      sortOrder: i,
    });
  }
  return out;
}

export async function revealField(field: Field, notePasscode?: string): Promise<string> {
  if (!field.protected) return field.value ?? '';
  if (!field.encrypted) return '';
  if (field.encrypted.v === 2) {
    if (!notePasscode) throw new NotePasscodeRequiredError();
    return decryptStringWithPasscode(notePasscode, field.encrypted);
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
