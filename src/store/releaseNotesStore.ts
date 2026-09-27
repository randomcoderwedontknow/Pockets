import { create } from 'zustand';
import { getStorage } from '@/platform/storage';
import { APP_VERSION } from '@/version';

const KEY = 'releaseNotes.lastSeenVersion';

interface ReleaseNotesState {
  loaded: boolean;
  shouldShowWhatsNew: boolean;
  load(): Promise<void>;
  markSeen(version?: string): Promise<void>;
}

export const useReleaseNotesStore = create<ReleaseNotesState>((set) => ({
  loaded: false,
  shouldShowWhatsNew: false,

  async load() {
    const last = await getStorage().getSetting<string>(KEY);
    set({ loaded: true, shouldShowWhatsNew: last !== APP_VERSION });
  },

  async markSeen(version = APP_VERSION) {
    await getStorage().setSetting(KEY, version);
    set({ shouldShowWhatsNew: false });
  },
}));
