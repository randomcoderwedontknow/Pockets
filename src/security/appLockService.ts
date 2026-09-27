import { fromBase64, randomBytes, toBase64, utf8Encode } from '@/crypto/encoding';
import { newKdfParams } from '@/crypto/vaultCrypto';
import type { KdfParams } from '@/platform/storage/StorageAdapter';
import { getStorage } from '@/platform/storage';
import { validatePasscode } from '@/security/securityService';

const APP_LOCK_KEY = 'appLock.pin';

interface AppLockPinRecord {
  kdf: KdfParams;
  /** base64 PBKDF2 verify token */
  verifier: string;
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

export async function hasAppLockPin(): Promise<boolean> {
  return (await getStorage().getSetting<AppLockPinRecord>(APP_LOCK_KEY)) != null;
}

export async function setupAppLockPin(passcode: string): Promise<void> {
  const err = validatePasscode(passcode);
  if (err) throw new Error(err);
  const kdf = newKdfParams();
  const bits = await deriveVerifier(passcode, kdf);
  await getStorage().setSetting(APP_LOCK_KEY, { kdf, verifier: toBase64(new Uint8Array(bits)) });
}

export async function changeAppLockPin(current: string, next: string): Promise<void> {
  const ok = await verifyAppLockPin(current);
  if (!ok) throw new Error('Current app lock code is incorrect.');
  await setupAppLockPin(next);
}

export async function verifyAppLockPin(passcode: string): Promise<boolean> {
  const record = await getStorage().getSetting<AppLockPinRecord>(APP_LOCK_KEY);
  if (!record) return false;
  try {
    const bits = await deriveVerifier(passcode, record.kdf);
    return toBase64(new Uint8Array(bits)) === record.verifier;
  } catch {
    return false;
  }
}

export async function clearAppLockPin(): Promise<void> {
  await getStorage().setSetting(APP_LOCK_KEY, null);
}

/** Random secret used to confirm WebAuthn app-unlock without a PIN. */
export async function getOrCreateAppUnlockSecret(): Promise<Uint8Array<ArrayBuffer>> {
  const KEY = 'appLock.webauthnSecret';
  const existing = await getStorage().getSetting<string>(KEY);
  if (existing) return fromBase64(existing);
  const secret = randomBytes(32);
  await getStorage().setSetting(KEY, toBase64(secret));
  return secret;
}
