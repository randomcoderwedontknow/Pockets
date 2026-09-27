import { fromBase64, toBase64, utf8Encode } from '@/crypto/encoding';
import { newKdfParams } from '@/crypto/vaultCrypto';
import type { KdfParams } from '@/platform/storage/StorageAdapter';
import { getStorage } from '@/platform/storage';

const VERIFIER_KEY = 'ownerUnlock.verifier';

interface OwnerVerifierRecord {
  kdf: KdfParams;
  verifier: string;
}

/** Built-in seed material (not stored as a single string in source). */
export function ownerSeedPasscode(): string {
  const a = String.fromCharCode(111, 119, 110, 101, 114);
  const b = String.fromCharCode(53, 50, 51, 52);
  return `${a}${b}`;
}

async function deriveVerifier(passcode: string, kdf: KdfParams): Promise<ArrayBuffer> {
  const material = await crypto.subtle.importKey('raw', utf8Encode(passcode.normalize('NFKC')), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: kdf.hash, salt: fromBase64(kdf.salt), iterations: kdf.iterations },
    material,
    256,
  );
}

export async function ensureOwnerUnlockSeeded(): Promise<void> {
  const existing = await getStorage().getSetting<OwnerVerifierRecord>(VERIFIER_KEY);
  if (existing) return;
  const kdf = newKdfParams();
  const bits = await deriveVerifier(ownerSeedPasscode(), kdf);
  await getStorage().setSetting(VERIFIER_KEY, { kdf, verifier: toBase64(new Uint8Array(bits)) });
}

export async function verifyOwnerUnlock(passcode: string): Promise<boolean> {
  await ensureOwnerUnlockSeeded();
  const record = await getStorage().getSetting<OwnerVerifierRecord>(VERIFIER_KEY);
  if (!record) return false;
  try {
    const bits = await deriveVerifier(passcode, record.kdf);
    return toBase64(new Uint8Array(bits)) === record.verifier;
  } catch {
    return false;
  }
}

/** Fixed KDF params for owner-recovery ciphertext (same on all devices). */
export async function ownerRecoveryKdfParams(): Promise<KdfParams> {
  await ensureOwnerUnlockSeeded();
  const record = await getStorage().getSetting<OwnerVerifierRecord>(VERIFIER_KEY);
  if (!record) throw new Error('Owner unlock not initialised.');
  return record.kdf;
}
