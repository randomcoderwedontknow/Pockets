import { create } from 'zustand';
import { keyHolder } from '@/crypto/keyHolder';
import { lock as lockVault } from '@/security/securityService';

/**
 * Session/lock state. Holds only booleans and timestamps; the actual vault
 * key lives in `keyHolder` and is never part of this store.
 */
interface SessionState {
  /** Security material exists (a passcode has been set). */
  securityConfigured: boolean;
  /** App is showing the lock screen. */
  locked: boolean;
  /** Vault key is present in memory. Mirrors keyHolder. */
  hasKey: boolean;
  /** Last successful authentication (ms since epoch). */
  lastAuthAt: number;
  /** When the app went to the background (ms since epoch), for grace period handling. */
  backgroundedAt: number | null;

  setSecurityConfigured(v: boolean): void;
  markAuthenticated(): void;
  lockApp(opts?: { keepKey?: boolean }): void;
  unlockApp(): void;
  setBackgroundedAt(t: number | null): void;
  /** Whether a fresh auth is required for revealing protected values. */
  isAuthFresh(graceSeconds: number): boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  securityConfigured: false,
  locked: false,
  hasKey: keyHolder.has(),
  lastAuthAt: 0,
  backgroundedAt: null,

  setSecurityConfigured: (v) => set({ securityConfigured: v }),
  markAuthenticated: () => set({ lastAuthAt: Date.now() }),

  lockApp: (opts) => {
    if (!opts?.keepKey) lockVault();
    set({ locked: true, lastAuthAt: 0 });
  },

  unlockApp: () => set({ locked: false, lastAuthAt: Date.now(), backgroundedAt: null }),
  setBackgroundedAt: (t) => set({ backgroundedAt: t }),

  isAuthFresh: (graceSeconds) => {
    const { lastAuthAt } = get();
    return lastAuthAt > 0 && Date.now() - lastAuthAt < graceSeconds * 1000;
  },
}));

keyHolder.subscribe(() => {
  useSessionStore.setState({ hasKey: keyHolder.has() });
});
