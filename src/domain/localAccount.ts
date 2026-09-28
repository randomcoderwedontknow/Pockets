export type LocalAccountId = 'local';

export interface LocalAccount {
  id: LocalAccountId;
  displayName: string;
  /** Preset avatar key, e.g. lavender-1 … lavender-8 */
  avatarPreset: string;
  /** Create-account flow and required app lock are finished. */
  profileSetupComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AVATAR_PRESETS = [
  { id: 'lavender-1', label: 'Lavender' },
  { id: 'lavender-2', label: 'Plum' },
  { id: 'lavender-3', label: 'Violet' },
  { id: 'lavender-4', label: 'Mauve' },
  { id: 'lavender-5', label: 'Dusk' },
  { id: 'lavender-6', label: 'Bloom' },
  { id: 'lavender-7', label: 'Haze' },
  { id: 'lavender-8', label: 'Soft' },
] as const;

export function defaultLocalAccount(now: string): LocalAccount {
  return {
    id: 'local',
    displayName: '',
    avatarPreset: 'lavender-1',
    profileSetupComplete: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function isProfileSetupComplete(account: LocalAccount): boolean {
  return account.profileSetupComplete === true;
}
