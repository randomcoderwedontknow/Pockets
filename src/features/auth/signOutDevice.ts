import { cancelAuthentication } from '@/features/lock/authFlow';
import { useAuthSessionStore } from '@/store/authSessionStore';
import { useSessionStore } from '@/store/sessionStore';
import { lock as lockVault } from '@/security/securityService';

export interface SignOutOptions {
  /** Clear service worker precache (web/PWA). Vault data in IndexedDB is kept. */
  clearWebCache?: boolean;
  /** Hard navigation to home so stack routes and in-memory UI reset. */
  reload?: boolean;
}

/** End this device session: drop vault key from memory and return to sign-in. */
export async function signOutDevice(options: SignOutOptions = {}): Promise<void> {
  const { clearWebCache = false, reload = true } = options;

  cancelAuthentication();
  lockVault();
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
