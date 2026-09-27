import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SettingsSubHeader } from './SettingsScreen';
import { useAccountStore } from '@/store/accountStore';
import { AVATAR_PRESETS } from '@/domain/localAccount';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Button } from '@/components/Button';

export function AccountSettings() {
  const account = useAccountStore();
  const [name, setName] = useState(account.displayName);
  const [preset, setPreset] = useState(account.avatarPreset);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await useAccountStore.getState().update({ displayName: name, avatarPreset: preset });
    } finally {
      setBusy(false);
    }
  };

  const created = account.createdAt
    ? new Date(account.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="page page--no-nav">
      <SettingsSubHeader title="Account" />
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <AvatarBadge preset={preset} name={name || 'You'} size={56} />
        <div>
          <p className="text-secondary" style={{ fontSize: 13 }}>
            On this device only
          </p>
          <p className="help" style={{ marginTop: 4 }}>
            Created {created}
          </p>
        </div>
      </div>

      <div className="stack">
        <label className="field">
          <span>Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>

        <div className="field">
          <span className="label">Avatar</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {AVATAR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="icon-btn"
                aria-pressed={preset === p.id}
                aria-label={p.label}
                onClick={() => setPreset(p.id)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  height: 'auto',
                  border: preset === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 14,
                  background: 'var(--bg-elevated)',
                }}
              >
                <AvatarBadge preset={p.id} name={name || p.label[0]} size={40} />
              </button>
            ))}
          </div>
        </div>

        <p className="help">
          This profile is stored on this device only. Back up your vault from{' '}
          <Link to="/settings/data">Data</Link> or review <Link to="/settings/security">Security</Link>.
        </p>

        <Button block onClick={save} disabled={busy}>
          Save profile
        </Button>
      </div>
    </div>
  );
}
