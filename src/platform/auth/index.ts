import { isNative } from '@/platform/platform';
import { AuthCancelledError, type AuthProvider, type BiometricAvailability } from './AuthProvider';
import { NativeBiometricProvider } from './NativeBiometricProvider';
import { WebAuthnProvider } from './WebAuthnProvider';

export { AuthCancelledError, AuthFailedError } from './AuthProvider';
export type { AuthProvider, AuthResult, BiometricAvailability, BiometricKind } from './AuthProvider';

class NoopProvider implements AuthProvider {
  readonly kind = 'none' as const;
  readonly label = 'Unavailable';
  async isAvailable(): Promise<BiometricAvailability> {
    return { available: false, detail: 'Device authentication is not available here.', canColdStart: false };
  }
  async isEnrolled() {
    return false;
  }
  async enrol() {
    throw new Error('Device authentication is not available.');
  }
  async unenrol() {}
  async authenticate(): Promise<never> {
    throw new AuthCancelledError('Device authentication is not available.');
  }
  async isAppLockEnrolled() {
    return false;
  }
  async enrolAppLock() {
    throw new Error('Device authentication is not available.');
  }
  async unenrolAppLock() {}
  async authenticateAppLock(): Promise<never> {
    throw new AuthCancelledError('Device authentication is not available.');
  }
}

let cached: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (cached) return cached;
  cached = isNative() ? new NativeBiometricProvider() : new WebAuthnProvider();
  return cached;
}

/** Test hook. */
export function setAuthProvider(p: AuthProvider | null) {
  cached = p;
}

export { NoopProvider };
