import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { SettingsSubHeader } from './SettingsScreen';

const OPTIONS: { key: ThemePreference; label: string; hint: string }[] = [
  { key: 'system', label: 'System', hint: 'Follow the phone setting' },
  { key: 'light', label: 'Light', hint: 'Soft paper background' },
  { key: 'dark', label: 'Dark', hint: 'Easy on the eyes at night' },
];

export function AppearanceSettings() {
  const theme = useSettingsStore((s) => s.theme);
  return (
    <div className="page">
      <SettingsSubHeader title="Appearance" />
      <div className="list">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className="list-item"
            onClick={() => useSettingsStore.getState().update({ theme: o.key })}
          >
            <div className="list-item__body">
              <div className="list-item__title">{o.label}</div>
              <div className="list-item__subtitle">{o.hint}</div>
            </div>
            <span aria-hidden>{theme === o.key ? '●' : '○'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
