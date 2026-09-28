import { create } from 'zustand';
import { defaultLocalAccount, isProfileSetupComplete, type LocalAccount } from '@/domain/localAccount';
import { nowISO } from '@/domain/ids';
import { getStorage } from '@/platform/storage';
import { hasAppLockPin } from '@/security/appLockService';
import { useSettingsStore } from './settingsStore';

interface AccountState extends LocalAccount {
  loaded: boolean;
  profileReady: boolean;
  load(): Promise<void>;
  update(patch: Partial<Pick<LocalAccount, 'displayName' | 'avatarPreset'>>): Promise<void>;
  completeProfileSetup(patch: Pick<LocalAccount, 'displayName' | 'avatarPreset'>): Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  ...defaultLocalAccount(nowISO()),
  loaded: false,
  profileReady: false,

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

    if (!isProfileSetupComplete(account)) {
      const [appPin, snap] = await Promise.all([hasAppLockPin(), storage.snapshot()]);
      const legacyUser =
        appPin ||
        snap.pockets.length > 0 ||
        snap.items.length > 0 ||
        account.displayName.trim().length > 0;
      if (legacyUser) {
        account = { ...account, profileSetupComplete: true, updatedAt: nowISO() };
        await storage.putLocalAccount(account);
      }
    }

    const profileReady = isProfileSetupComplete(account);
    set({ ...account, loaded: true, profileReady });
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
      profileSetupComplete: current.profileSetupComplete,
      createdAt: current.createdAt,
      updatedAt: nowISO(),
    };
    await getStorage().putLocalAccount(updated);
    set({ ...updated, profileReady: isProfileSetupComplete(updated) });
    await useSettingsStore.getState().update({ displayName: updated.displayName });
  },

  async completeProfileSetup(patch) {
    const current = get();
    const now = nowISO();
    const updated: LocalAccount = {
      id: 'local',
      displayName: patch.displayName.trim() || 'You',
      avatarPreset: patch.avatarPreset,
      profileSetupComplete: true,
      createdAt: current.createdAt || now,
      updatedAt: now,
    };
    await getStorage().putLocalAccount(updated);
    set({ ...updated, profileReady: true });
    await useSettingsStore.getState().update({ displayName: updated.displayName });
  },
}));
