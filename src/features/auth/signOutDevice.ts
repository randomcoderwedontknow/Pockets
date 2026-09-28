import { cancelAuthentication } from '@/features/lock/authFlow';
import { getAuthProvider } from '@/platform/auth';
import { getStorage } from '@/platform/storage';
import { clearAppLockPin } from '@/security/appLockService';
import { lock as lockVault } from '@/security/securityService';
import { useAuthSessionStore } from '@/store/authSessionStore';
import { useSessionStore } from '@/store/sessionStore';
import { resetVaultStoreLocks } from '@/store/vaultStore';

export interface SignOutOptions {
  /** Clear service worker precache (web/PWA) after wiping local data. */
  clearWebCache?: boolean;
  /** Hard navigation to home so stack routes and in-memory UI reset. */
  reload?: boolean;
}

/**
 * Remove this device's local account and vault, then return to create-account onboarding.
 * Export first from Settings → Data if you need a backup.
 */
export async function signOutDevice(options: SignOutOptions = {}): Promise<void> {
  const { clearWebCache = false, reload = true } = options;

  cancelAuthentication();
  lockVault();

  try {
    await getAuthProvider().unenrolAppLock();
  } catch {
    /* ignore */
  }
  await clearAppLockPin();
  await getStorage().clearAll();
  resetVaultStoreLocks();

  useSessionStore.getState().setSecurityConfigured(false);
  useSessionStore.getState().lockApp();
  useAuthSessionStore.getState().signOut();

  if (clearWebCache && typeof window !== 'undefined') {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      /* best-effort */
    }
  }

  if (reload) {
    window.location.assign('/');
  }
}
