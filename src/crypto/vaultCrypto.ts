/**
 * Vault cryptography.
 *
 *   passcode --PBKDF2--> KEK --AES-GCM wrap--> [wrappedKey]  (stored)
 *   vaultKey (random 256-bit) --AES-GCM--> field ciphertext   (stored)
 *
 * The passcode is never stored. Verifying a passcode = successfully
 * unwrapping the vault key (AES-GCM authentication fails otherwise).
 * Changing the passcode only re-wraps the vault key; field ciphertext
 * remains valid.
 */
import type { EncryptedValue } from '@/domain/types';
import type { KdfParams } from '@/platform/storage/StorageAdapter';
import { fromBase64, randomBytes, toBase64, utf8Decode, utf8Encode } from './encoding';

export const DEFAULT_PBKDF2_ITERATIONS = 250_000;
const AES_PARAMS: AesKeyGenParams = { name: 'AES-GCM', length: 256 };

const subtle = () => {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is not available in this environment.');
  }
  return crypto.subtle;
};

export function newKdfParams(iterations = DEFAULT_PBKDF2_ITERATIONS): KdfParams {
  return {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations,
    salt: toBase64(randomBytes(16)),
  };
}

/** Derive the key-encryption-key from a passcode. Non-extractable. */
export async function deriveKek(passcode: string, kdf: KdfParams): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', utf8Encode(passcode.normalize('NFKC')), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: kdf.hash, salt: fromBase64(kdf.salt), iterations: kdf.iterations },
    material,
    AES_PARAMS,
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

/** Build a wrapping key from raw secret bytes (e.g. WebAuthn PRF output). */
export async function kekFromRawSecret(secret: Uint8Array<ArrayBuffer>, info: string): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8Encode(info) },
    base,
    AES_PARAMS,
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export async function generateVaultKey(): Promise<CryptoKey> {
  // Extractable is required so the key can be wrapped; it never leaves memory unwrapped.
  return subtle().generateKey(AES_PARAMS, true, ['encrypt', 'decrypt']);
}

export async function wrapVaultKey(vaultKey: CryptoKey, kek: CryptoKey): Promise<EncryptedValue> {
  const iv = randomBytes(12);
  const wrapped = await subtle().wrapKey('raw', vaultKey, kek, { name: 'AES-GCM', iv });
  return { v: 1, iv: toBase64(iv), ct: toBase64(wrapped) };
}

export class WrongCredentialError extends Error {
  constructor() {
    super('Incorrect passcode.');
    this.name = 'WrongCredentialError';
  }
}

export async function unwrapVaultKey(wrapped: EncryptedValue, kek: CryptoKey): Promise<CryptoKey> {
  try {
    return await subtle().unwrapKey(
      'raw',
      fromBase64(wrapped.ct),
      kek,
      { name: 'AES-GCM', iv: fromBase64(wrapped.iv) },
      AES_PARAMS,
      true,
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new WrongCredentialError();
  }
}

export async function encryptString(vaultKey: CryptoKey, plaintext: string): Promise<EncryptedValue> {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, vaultKey, utf8Encode(plaintext));
  return { v: 1, iv: toBase64(iv), ct: toBase64(ct) };
}

export class DecryptError extends Error {
  constructor() {
    super('Could not decrypt value.');
    this.name = 'DecryptError';
  }
}

export async function decryptString(vaultKey: CryptoKey, value: EncryptedValue): Promise<string> {
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(value.iv) }, vaultKey, fromBase64(value.ct));
    return utf8Decode(pt);
  } catch {
    throw new DecryptError();
  }
}

export function isEncryptedValue(v: unknown): v is EncryptedValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    ((v as EncryptedValue).v === 1 || (v as EncryptedValue).v === 2) &&
    typeof (v as EncryptedValue).iv === 'string' &&
    typeof (v as EncryptedValue).ct === 'string'
  );
}

async function deriveDataKey(passcode: string, kdf: KdfParams): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', utf8Encode(passcode.normalize('NFKC')), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: kdf.hash, salt: fromBase64(kdf.salt), iterations: kdf.iterations },
    material,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt with a note-specific passcode (v2 ciphertext). */
export async function encryptStringWithPasscode(passcode: string, plaintext: string): Promise<EncryptedValue> {
  const kdf = newKdfParams();
  const dataKey = await deriveDataKey(passcode, kdf);
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, dataKey, utf8Encode(plaintext));
  return { v: 2, iv: toBase64(iv), ct: toBase64(ct), kdf };
}

export async function decryptStringWithPasscode(passcode: string, value: EncryptedValue): Promise<string> {
  if (value.v !== 2 || !value.kdf) throw new DecryptError();
  const dataKey = await deriveDataKey(passcode, value.kdf);
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(value.iv) }, dataKey, fromBase64(value.ct));
    return utf8Decode(pt);
  } catch {
    throw new WrongCredentialError();
  }
}

/** Owner-recovery escrow (v11); key derived from seeded owner material + fixed seed passcode. */
export async function encryptOwnerRecovery(plaintext: string, passcode: string, kdf: KdfParams): Promise<EncryptedValue> {
  const dataKey = await deriveDataKey(passcode, kdf);
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, dataKey, utf8Encode(plaintext));
  return { v: 2, iv: toBase64(iv), ct: toBase64(ct), kdf };
}

export async function decryptOwnerRecovery(passcode: string, value: EncryptedValue): Promise<string> {
  if (!value.kdf) throw new DecryptError();
  const dataKey = await deriveDataKey(passcode, value.kdf);
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(value.iv) }, dataKey, fromBase64(value.ct));
    return utf8Decode(pt);
  } catch {
    throw new WrongCredentialError();
  }
}
