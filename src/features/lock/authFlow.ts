import { getAuthProvider } from '@/platform/auth';
import { AuthCancelledError } from '@/platform/auth/AuthProvider';
import { keyHolder } from '@/crypto/keyHolder';
import { verifyAppLockPin } from '@/security/appLockService';
import { verifyOwnerUnlock } from '@/security/ownerUnlockService';
import { hasPasscode, unlockWithPasscode } from '@/security/securityService';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

export interface AuthRequest {
  reason: string;
  /** If true, the operation cannot proceed without a vault key in memory. */
  requireKey: boolean;
}

type Resolver = (ok: boolean) => void;

interface Pending {
  request: AuthRequest;
  resolve: Resolver;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();

export function getPendingAuth(): AuthRequest | null {
  return pending?.request ?? null;
}

export function subscribeAuthPrompt(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Ask the user to authenticate. Opens the in-app prompt (biometric + passcode).
 * Resolves true when authentication succeeded and (if required) a vault key is present.
 */
export function requestAuthentication(req: AuthRequest): Promise<boolean> {
  if (pending) {
    // Re-use the existing prompt.
    return new Promise((resolve) => {
      const prev = pending!.resolve;
      pending!.resolve = (ok) => {
        prev(ok);
        resolve(ok);
      };
    });
  }
  return new Promise((resolve) => {
    pending = { request: req, resolve };
    notify();
  });
}

export function cancelAuthentication() {
  if (!pending) return;
  const { resolve } = pending;
  pending = null;
  notify();
  resolve(false);
}

export async function submitPasscode(passcode: string): Promise<void> {
  if (!pending) return;
  if (await verifyOwnerUnlock(passcode)) {
    finish(true);
    return;
  }
  if (await verifyAppLockPin(passcode)) {
    finish(true);
    return;
  }
  if (await hasPasscode()) {
    try {
      await unlockWithPasscode(passcode);
      finish(true);
      return;
    } catch {
      /* fall through */
    }
  }
  throw new Error('Incorrect app lock code.');
}

export async function submitBiometric(): Promise<void> {
  if (!pending) return;
  const provider = getAuthProvider();
  if (await provider.isAppLockEnrolled()) {
    await provider.authenticateAppLock(pending.request.reason);
    finish(true);
    return;
  }
  const result = await provider.authenticate(pending.request.reason);
  if (result.vaultKey) {
    keyHolder.set(result.vaultKey);
  }
  if (pending.request.requireKey && !keyHolder.has()) {
    throw new Error('Set an app lock code in Settings, or use the passcode for this note.');
  }
  finish(true);
}

function finish(ok: boolean) {
  if (!pending) return;
  const { resolve } = pending;
  pending = null;
  if (ok) {
    useSessionStore.getState().unlockApp();
    useSessionStore.getState().markAuthenticated();
  }
  notify();
  resolve(ok);
}

export function failAuth(e: unknown): string {
  if (e instanceof AuthCancelledError) return '';
  return (e as Error)?.message || 'Authentication failed.';
}

export async function canOfferBiometric(): Promise<{ offer: boolean; canColdStart: boolean; label: string }> {
  const { biometricsEnabled } = useSettingsStore.getState();
  if (!biometricsEnabled) return { offer: false, canColdStart: false, label: '' };
  const provider = getAuthProvider();
  const avail = await provider.isAvailable();
  const appLockBio = await provider.isAppLockEnrolled();
  const vaultBio = await provider.isEnrolled();
  if (!avail.available || (!appLockBio && !vaultBio)) {
    return { offer: false, canColdStart: false, label: provider.label };
  }
  if (appLockBio) {
    return { offer: true, canColdStart: true, label: provider.label };
  }
  const canColdStart = avail.canColdStart;
  const requireKey = pending?.request.requireKey ?? false;
  const offer =
    appLockBio ||
    canColdStart ||
    keyHolder.has() ||
    !requireKey ||
    (await hasPasscode());
  return { offer, canColdStart: appLockBio || canColdStart, label: provider.label };
}
