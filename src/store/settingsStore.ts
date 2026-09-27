import { create } from 'zustand';
import { getStorage } from '@/platform/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemePreference;
  /** Lock the whole app when it goes to the background / on launch. */
  appLock: boolean;
  /** Seconds the app may stay in the background before locking. */
  lockGraceSeconds: number;
  /** Ask for authentication each time a protected value is revealed. */
  reauthForProtected: boolean;
  /** Seconds a successful authentication remains valid for revealing protected values. */
  protectedGraceSeconds: number;
  /** Offer biometric (WebAuthn / native) unlock where available. */
  biometricsEnabled: boolean;
  /** Seconds after which a copied protected value is cleared from the clipboard (0 = never). */
  clipboardClearSeconds: number;
  displayName: string;
  /** Recently opened item ids (max 5), most recent first. */
  recentItemIds: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  appLock: false,
  lockGraceSeconds: 0,
  reauthForProtected: true,
  protectedGraceSeconds: 30,
  biometricsEnabled: true,
  clipboardClearSeconds: 30,
  displayName: '',
  recentItemIds: [],
};

const SETTINGS_KEY = 'settings';
const THEME_MIRROR_KEY = 'pockets.theme';

interface SettingsState extends Settings {
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Settings>): Promise<void>;
  recordRecentItem(itemId: string): Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  async load() {
    const stored = await getStorage().getSetting<Partial<Settings>>(SETTINGS_KEY);
    const merged = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    set({ ...merged, loaded: true });
    applyTheme(merged.theme);
  },

  async update(patch) {
    const next = { ...pickSettings(get()), ...patch };
    set(next);
    if (patch.theme) applyTheme(patch.theme);
    await getStorage().setSetting(SETTINGS_KEY, next);
  },

  async recordRecentItem(itemId) {
    const ids = get().recentItemIds.filter((id) => id !== itemId);
    ids.unshift(itemId);
    await get().update({ recentItemIds: ids.slice(0, 5) });
  },
}));

function pickSettings(s: SettingsState): Settings {
  const out = {} as Settings;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    (out as unknown as Record<string, unknown>)[k] = s[k];
  }
  return out;
}

/* ---------------------------- Theme ------------------------------- */

let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

export function applyTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return;
  try {
    localStorage.setItem(THEME_MIRROR_KEY, pref);
  } catch {
    /* ignore */
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaListener) mq.removeEventListener('change', mediaListener);
  const resolve = () => (pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref);
  const set = () => {
    const theme = resolve();
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    const color = theme === 'dark' ? '#16131f' : '#f5f3f8';
    if (meta) meta.content = color;
    else {
      const m = document.createElement('meta');
      m.name = 'theme-color';
      m.content = color;
      document.head.appendChild(m);
    }
  };
  set();
  if (pref === 'system') {
    mediaListener = () => set();
    mq.addEventListener('change', mediaListener);
  }
}

/** Applies the last-known theme synchronously before React mounts to avoid a flash. */
export function applyInitialTheme() {
  let pref: ThemePreference = 'system';
  try {
    const v = localStorage.getItem(THEME_MIRROR_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') pref = v;
  } catch {
    /* ignore */
  }
  applyTheme(pref);
}
