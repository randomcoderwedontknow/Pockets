/**
 * Holds the unwrapped vault key in memory only.
 *
 * Deliberately not part of any React/Zustand state so it is never serialised,
 * persisted, logged or exposed through devtools state inspection. Cleared on
 * lock. A page reload always starts with no key.
 */
let vaultKey: CryptoKey | null = null;
const listeners = new Set<() => void>();

export const keyHolder = {
  get(): CryptoKey | null {
    return vaultKey;
  },
  has(): boolean {
    return vaultKey !== null;
  },
  set(key: CryptoKey) {
    vaultKey = key;
    listeners.forEach((l) => l());
  },
  clear() {
    vaultKey = null;
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
