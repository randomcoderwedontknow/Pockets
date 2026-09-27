/**
 * Biometric / device authentication abstraction.
 *
 *   AuthProvider (interface)
 *     ├─ WebAuthnProvider   – browsers: platform authenticator via WebAuthn,
 *     │                        PRF extension when available for cold-start unlock
 *     ├─ NativeBiometricProvider – Capacitor/Android: real BiometricPrompt +
 *     │                        Keystore-backed secure storage for the vault key
 *     └─ NoopProvider       – nothing available; passcode only
 *
 * Passcode authentication is always available and lives in securityService.
 */

export type BiometricKind = 'webauthn' | 'native' | 'none';

export interface BiometricAvailability {
  available: boolean;
  /** Human readable reason when unavailable, or a description when available. */
  detail: string;
  /**
   * True when the provider can recover the vault key by itself (WebAuthn PRF or
   * native secure storage). False means the provider only verifies the user is
   * present, so it can only re-unlock while the vault key is still in memory.
   */
  canColdStart: boolean;
}

export interface AuthResult {
  verified: true;
  /** Recovered vault key, or null when the provider only verified presence. */
  vaultKey: CryptoKey | null;
}

export class AuthCancelledError extends Error {
  constructor(message = 'Authentication was cancelled.') {
    super(message);
    this.name = 'AuthCancelledError';
  }
}

export class AuthFailedError extends Error {
  constructor(message = 'Authentication failed.') {
    super(message);
    this.name = 'AuthFailedError';
  }
}

export interface AuthProvider {
  readonly kind: BiometricKind;
  readonly label: string;
  isAvailable(): Promise<BiometricAvailability>;
  isEnrolled(): Promise<boolean>;
  /** Register this device for biometric unlock. Requires the vault key to be in memory. */
  enrol(vaultKey: CryptoKey): Promise<void>;
  unenrol(): Promise<void>;
  /** Trigger the real platform authentication prompt. */
  authenticate(reason: string): Promise<AuthResult>;

  /** App shell unlock (independent of vault / note passcodes). */
  isAppLockEnrolled(): Promise<boolean>;
  enrolAppLock(): Promise<void>;
  unenrolAppLock(): Promise<void>;
  authenticateAppLock(reason: string): Promise<{ verified: true }>;
}
