import { create } from 'zustand';
import { defaultLocalAccount, type LocalAccount } from '@/domain/localAccount';
import { nowISO } from '@/domain/ids';
import { getStorage } from '@/platform/storage';
import { useSettingsStore } from './settingsStore';

interface AccountState extends LocalAccount {
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Pick<LocalAccount, 'displayName' | 'avatarPreset'>>): Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  ...defaultLocalAccount(nowISO()),
  loaded: false,

  async load() {
    const storage = getStorage();
    let account = await storage.getLocalAccount();
    if (!account) {
      const settings = useSettingsStore.getState();
      const now = nowISO();
      account = {
        ...defaultLocalAccount(now),
        displayName: settings.displayName || '',
      };
      await storage.putLocalAccount(account);
    }
    set({ ...account, loaded: true });
    if (account.displayName !== useSettingsStore.getState().displayName) {
      await useSettingsStore.getState().update({ displayName: account.displayName });
    }
  },

  async update(patch) {
    const current = get();
    const updated: LocalAccount = {
      id: 'local',
      displayName: patch.displayName !== undefined ? patch.displayName.trim() : current.displayName,
      avatarPreset: patch.avatarPreset ?? current.avatarPreset,
      createdAt: current.createdAt,
      updatedAt: nowISO(),
    };
    await getStorage().putLocalAccount(updated);
    set(updated);
    await useSettingsStore.getState().update({ displayName: updated.displayName });
  },
}));
