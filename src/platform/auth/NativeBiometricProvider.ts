import { getStorage } from '@/platform/storage';
import { fromBase64, toBase64 } from '@/crypto/encoding';
import { AuthCancelledError, AuthFailedError, type AuthProvider, type AuthResult, type BiometricAvailability } from './AuthProvider';

/**
 * Android (Capacitor) biometric authentication.
 *
 * - `@aparajita/capacitor-biometric-auth` shows the real Android
 *   BiometricPrompt (fingerprint / face / device credential as available on
 *   the Samsung Galaxy A05).
 * - `@aparajita/capacitor-secure-storage` keeps the raw vault key in Android
 *   Keystore-backed encrypted storage. It is only read after the prompt
 *   succeeds, which allows biometric unlock from a cold start.
 *
 * Plugins are imported lazily so the web bundle never loads them.
 */

const VAULT_KEY_ITEM = 'pockets.vaultKey.v1';
const ENROLLED_FLAG = 'native.biometric.enrolled';
const APP_LOCK_ENROLLED = 'native.applock.enrolled';

async function plugins() {
  const [{ BiometricAuth, BiometryErrorType }, { SecureStorage }] = await Promise.all([
    import('@aparajita/capacitor-biometric-auth'),
    import('@aparajita/capacitor-secure-storage'),
  ]);
  return { BiometricAuth, BiometryErrorType, SecureStorage };
}

export class NativeBiometricProvider implements AuthProvider {
  readonly kind = 'native' as const;
  readonly label = 'Biometrics';

  async isAvailable(): Promise<BiometricAvailability> {
    try {
      const { BiometricAuth } = await plugins();
      const check = await BiometricAuth.checkBiometry();
      if (!check.isAvailable) {
        return { available: false, detail: check.reason || 'Biometric authentication is not available.', canColdStart: false };
      }
      return { available: true, detail: 'Unlock with your device biometrics or screen lock.', canColdStart: true };
    } catch (e) {
      return { available: false, detail: (e as Error).message || 'Biometric plugin unavailable.', canColdStart: false };
    }
  }

  async isEnrolled(): Promise<boolean> {
    return (await getStorage().getSetting<boolean>(ENROLLED_FLAG)) === true || (await this.isAppLockEnrolled());
  }

  async isAppLockEnrolled(): Promise<boolean> {
    return (await getStorage().getSetting<boolean>(APP_LOCK_ENROLLED)) === true;
  }

  async enrolAppLock(): Promise<void> {
    const { BiometricAuth } = await plugins();
    await this.prompt(BiometricAuth, 'Confirm to unlock Pockets with biometrics');
    await getStorage().setSetting(APP_LOCK_ENROLLED, true);
  }

  async unenrolAppLock(): Promise<void> {
    await getStorage().setSetting(APP_LOCK_ENROLLED, false);
  }

  async authenticateAppLock(reason: string): Promise<{ verified: true }> {
    const { BiometricAuth } = await plugins();
    await this.prompt(BiometricAuth, reason);
    return { verified: true };
  }

  async enrol(vaultKey: CryptoKey): Promise<void> {
    const { BiometricAuth, SecureStorage } = await plugins();
    // Prove the user can authenticate before storing anything.
    await this.prompt(BiometricAuth, 'Confirm to enable biometric unlock');
    const raw = await crypto.subtle.exportKey('raw', vaultKey);
    await SecureStorage.setItem(VAULT_KEY_ITEM, toBase64(raw));
    await getStorage().setSetting(ENROLLED_FLAG, true);
  }

  async unenrol(): Promise<void> {
    try {
      const { SecureStorage } = await plugins();
      await SecureStorage.removeItem(VAULT_KEY_ITEM);
    } catch {
      /* ignore */
    }
    await getStorage().setSetting(ENROLLED_FLAG, false);
  }

  async authenticate(reason: string): Promise<AuthResult> {
    const { BiometricAuth, SecureStorage } = await plugins();
    await this.prompt(BiometricAuth, reason);
    const stored = await SecureStorage.getItem(VAULT_KEY_ITEM);
    if (!stored) throw new AuthFailedError('Biometric unlock is not set up. Use your passcode.');
    const vaultKey = await crypto.subtle.importKey('raw', fromBase64(stored), { name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    return { verified: true, vaultKey };
  }

  private async prompt(
    BiometricAuth: Awaited<ReturnType<typeof plugins>>['BiometricAuth'],
    reason: string,
  ): Promise<void> {
    const { BiometryErrorType } = await plugins();
    try {
      await BiometricAuth.authenticate({
        reason,
        androidTitle: 'Pockets',
        androidSubtitle: reason,
        allowDeviceCredential: true,
        cancelTitle: 'Use passcode',
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === BiometryErrorType.userCancel || code === BiometryErrorType.userFallback) {
        throw new AuthCancelledError();
      }
      throw new AuthFailedError((e as Error).message || 'Biometric authentication failed.');
    }
  }
}
