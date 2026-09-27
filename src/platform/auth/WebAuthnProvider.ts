import { getStorage } from '@/platform/storage';
import type { WebAuthnRecord } from '@/platform/storage/StorageAdapter';
import { fromBase64, fromBase64Url, randomBytes, toBase64, toBase64Url } from '@/crypto/encoding';
import { kekFromRawSecret, unwrapVaultKey, wrapVaultKey } from '@/crypto/vaultCrypto';
import { nowISO } from '@/domain/ids';
import { AuthCancelledError, AuthFailedError, type AuthProvider, type AuthResult, type BiometricAvailability } from './AuthProvider';

/**
 * WebAuthn-based device authentication for browsers.
 *
 * Uses a platform authenticator (fingerprint / face / device PIN as configured
 * in the OS) with `userVerification: "required"`. The browser performs the
 * real verification prompt; there is no simulated scanner.
 *
 * If the authenticator supports the PRF extension, its output derives a key
 * that wraps the vault key, so biometrics alone can unlock after a reload.
 * Without PRF, WebAuthn only proves the user is present, so it is offered
 * only while the vault key is already in memory (soft lock).
 */

const RP_NAME = 'Pockets';
const USER_ID_KEY = 'webauthn.userId';
const APP_LOCK_CREDENTIAL_KEY = 'appLock.webauthn';
const PRF_INFO = 'pockets-webauthn-prf-v1';

type PrfExtensionInputs = { prf?: { eval?: { first: BufferSource } } | Record<string, never> };
type PrfExtensionOutputs = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

function rpId(): string {
  return window.location.hostname;
}

function isSecureCtx(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

async function getRecord(): Promise<WebAuthnRecord | null> {
  const sec = await getStorage().getSecurity();
  return sec?.webauthn ?? null;
}

async function saveRecord(record: WebAuthnRecord | null) {
  const storage = getStorage();
  const sec = await storage.getSecurity();
  if (!sec) throw new Error('Set a passcode before enabling biometric unlock.');
  await storage.putSecurity({ ...sec, webauthn: record, updatedAt: nowISO() });
}

function mapError(e: unknown): Error {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return new AuthCancelledError();
  if (name === 'InvalidStateError') return new AuthFailedError('This device is already registered.');
  if (name === 'SecurityError') return new AuthFailedError('Biometric unlock needs a secure (https) connection.');
  return new AuthFailedError((e as Error)?.message || 'Authentication failed.');
}

export class WebAuthnProvider implements AuthProvider {
  readonly kind = 'webauthn' as const;
  readonly label = 'Device biometrics';

  async isAvailable(): Promise<BiometricAvailability> {
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
      return { available: false, detail: 'This browser does not support device authentication.', canColdStart: false };
    }
    if (!isSecureCtx()) {
      return { available: false, detail: 'Device authentication needs a secure (https) connection.', canColdStart: false };
    }
    try {
      const uvpa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!uvpa) {
        return { available: false, detail: 'No fingerprint, face or screen lock is set up on this device.', canColdStart: false };
      }
    } catch {
      return { available: false, detail: 'Could not check device authentication support.', canColdStart: false };
    }
    const record = await getRecord();
    const canColdStart = !!record?.prfEnabled && !!record.prfWrappedKey;
    return {
      available: true,
      detail: canColdStart
        ? 'Your device can unlock Pockets on its own.'
        : 'Your device can verify you; the passcode is still needed after a restart.',
      canColdStart,
    };
  }

  async isEnrolled(): Promise<boolean> {
    return (await getRecord()) !== null || (await this.isAppLockEnrolled());
  }

  async getAppLockRecord(): Promise<WebAuthnRecord | null> {
    return (await getStorage().getSetting<WebAuthnRecord>(APP_LOCK_CREDENTIAL_KEY)) ?? null;
  }

  async saveAppLockRecord(record: WebAuthnRecord | null) {
    await getStorage().setSetting(APP_LOCK_CREDENTIAL_KEY, record);
  }

  async isAppLockEnrolled(): Promise<boolean> {
    return (await this.getAppLockRecord()) !== null;
  }

  async enrolAppLock(): Promise<void> {
    const storage = getStorage();
    let userId = await storage.getSetting<string>(USER_ID_KEY);
    if (!userId) {
      userId = toBase64(randomBytes(16));
      await storage.setSetting(USER_ID_KEY, userId);
    }

    let credential: PublicKeyCredential;
    try {
      credential = (await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: RP_NAME, id: rpId() },
          user: { id: fromBase64(userId), name: 'pockets-applock', displayName: 'Pockets' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60_000,
          attestation: 'none',
        },
      })) as PublicKeyCredential;
    } catch (e) {
      throw mapError(e);
    }
    if (!credential) throw new AuthFailedError();

    await this.saveAppLockRecord({
      credentialId: toBase64Url(credential.rawId),
      prfEnabled: false,
      prfSalt: null,
      prfWrappedKey: null,
      createdAt: nowISO(),
    });
  }

  async unenrolAppLock(): Promise<void> {
    await this.saveAppLockRecord(null);
  }

  async authenticateAppLock(_reason: string): Promise<{ verified: true }> {
    const record = await this.getAppLockRecord();
    if (!record) throw new AuthFailedError('Biometric app unlock is not set up.');

    let assertion: PublicKeyCredential;
    try {
      assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          rpId: rpId(),
          allowCredentials: [{ type: 'public-key', id: fromBase64Url(record.credentialId) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })) as PublicKeyCredential;
    } catch (e) {
      throw mapError(e);
    }
    if (!assertion || toBase64Url(assertion.rawId) !== record.credentialId) {
      throw new AuthFailedError('Unexpected credential.');
    }
    return { verified: true };
  }

  async enrol(vaultKey: CryptoKey): Promise<void> {
    const storage = getStorage();
    let userId = await storage.getSetting<string>(USER_ID_KEY);
    if (!userId) {
      userId = toBase64(randomBytes(16));
      await storage.setSetting(USER_ID_KEY, userId);
    }

    let credential: PublicKeyCredential;
    try {
      credential = (await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: RP_NAME, id: rpId() },
          user: { id: fromBase64(userId), name: 'pockets-user', displayName: 'Pockets' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60_000,
          attestation: 'none',
          extensions: { prf: {} } as PrfExtensionInputs,
        },
      })) as PublicKeyCredential;
    } catch (e) {
      throw mapError(e);
    }
    if (!credential) throw new AuthFailedError();

    const ext = credential.getClientExtensionResults() as PrfExtensionOutputs;
    const prfEnabled = ext.prf?.enabled === true;
    const credentialId = toBase64Url(credential.rawId);

    let record: WebAuthnRecord = { credentialId, prfEnabled, prfSalt: null, prfWrappedKey: null, createdAt: nowISO() };

    if (prfEnabled) {
      // A second ceremony is required to evaluate the PRF and obtain the secret.
      const salt = randomBytes(32);
      try {
        const secret = await this.evaluatePrf(credentialId, salt);
        if (secret) {
          const kek = await kekFromRawSecret(secret, PRF_INFO);
          const prfWrappedKey = await wrapVaultKey(vaultKey, kek);
          record = { ...record, prfSalt: toBase64(salt), prfWrappedKey };
        } else {
          record = { ...record, prfEnabled: false };
        }
      } catch {
        record = { ...record, prfEnabled: false };
      }
    }

    await saveRecord(record);
  }

  async unenrol(): Promise<void> {
    await saveRecord(null);
  }

  async authenticate(_reason: string): Promise<AuthResult> {
    const record = await getRecord();
    if (!record) throw new AuthFailedError('Biometric unlock is not set up on this device.');

    const usePrf = record.prfEnabled && record.prfSalt && record.prfWrappedKey;
    const salt = usePrf ? fromBase64(record.prfSalt as string) : null;

    let assertion: PublicKeyCredential;
    try {
      assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          rpId: rpId(),
          allowCredentials: [{ type: 'public-key', id: fromBase64Url(record.credentialId) }],
          userVerification: 'required',
          timeout: 60_000,
          extensions: salt ? ({ prf: { eval: { first: salt } } } as PrfExtensionInputs) : undefined,
        },
      })) as PublicKeyCredential;
    } catch (e) {
      throw mapError(e);
    }
    if (!assertion || toBase64Url(assertion.rawId) !== record.credentialId) {
      throw new AuthFailedError('Unexpected credential.');
    }

    if (usePrf) {
      const out = (assertion.getClientExtensionResults() as PrfExtensionOutputs).prf?.results?.first;
      if (!out) throw new AuthFailedError('Device did not return the unlock secret.');
      const kek = await kekFromRawSecret(new Uint8Array(out), PRF_INFO);
      const vaultKey = await unwrapVaultKey(record.prfWrappedKey as NonNullable<typeof record.prfWrappedKey>, kek);
      return { verified: true, vaultKey };
    }
    return { verified: true, vaultKey: null };
  }

  private async evaluatePrf(credentialId: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer> | null> {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: rpId(),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
        extensions: { prf: { eval: { first: salt } } } as PrfExtensionInputs,
      },
    })) as PublicKeyCredential | null;
    const out = assertion ? (assertion.getClientExtensionResults() as PrfExtensionOutputs).prf?.results?.first : undefined;
    return out ? new Uint8Array(out) : null;
  }
}
