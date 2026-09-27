import { Link } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronRight, Database, GraduationCap, Info, Layers, Palette, Shield, User } from 'lucide-react';
import { AvatarBadge } from '@/components/AvatarBadge';
import { useAccountStore } from '@/store/accountStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { Button } from '@/components/Button';

const ROWS = [
  { to: '/settings/account', icon: User, title: 'Account', sub: 'Name and avatar on this device' },
  { to: '/settings/appearance', icon: Palette, title: 'Appearance', sub: 'Light, dark or system' },
  { to: '/settings/security', icon: Shield, title: 'Security', sub: 'Lock, passcode, biometrics' },
  { to: '/settings/data', icon: Database, title: 'Data', sub: 'Export, import, storage' },
  { to: '/settings/pockets', icon: Layers, title: 'Pockets', sub: 'Manage and reorder' },
  { to: '/settings/tutorial', icon: GraduationCap, title: 'Help & tutorial', sub: 'Learn how Pockets works' },
  { to: '/settings/about', icon: Info, title: 'About', sub: 'Version and credits' },
];

export function SettingsScreen() {
  const navigate = useSmoothNavigate();
  const { displayName, avatarPreset } = useAccountStore();
  const tutorialStatus = useTutorialStore((s) => s.status);

  const restartTutorial = async () => {
    await useTutorialStore.getState().reset();
    navigate('/settings/tutorial');
  };

  return (
    <div className="page">
      <header style={{ marginBottom: 20 }}>
        <h1>Settings</h1>
      </header>

      <Link to="/settings/account" className="card card--interactive" style={{ display: 'flex', gap: 14, padding: 16, marginBottom: 16, alignItems: 'center' }}>
        <AvatarBadge preset={avatarPreset} name={displayName || 'You'} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650 }}>{displayName.trim() || 'Your profile'}</div>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            Stored on this device only
          </div>
        </div>
        <ChevronRight size={18} className="text-tertiary" />
      </Link>

      <div className="list">
        {ROWS.map((r) => (
          <Link key={r.to} to={r.to} className="list-item">
            <span className="icon-badge icon-badge--soft">
              <r.icon size={18} />
            </span>
            <div className="list-item__body">
              <div className="list-item__title">{r.title}</div>
              <div className="list-item__subtitle">{r.sub}</div>
            </div>
            <ChevronRight size={18} className="text-tertiary" />
          </Link>
        ))}
      </div>

      {tutorialStatus !== 'never' && (
        <div style={{ marginTop: 20 }}>
          <Button variant="ghost" block onClick={() => void restartTutorial()}>
            Restart tutorial
          </Button>
        </div>
      )}
    </div>
  );
}

export function SettingsSubHeader({ title }: { title: string }) {
  const navigate = useSmoothNavigate();
  return (
    <header className="row" style={{ marginBottom: 20 }}>
      <button type="button" className="chip" onClick={() => navigate(-1)}>
        Back
      </button>
      <h2 style={{ flex: 1, textAlign: 'center' }}>{title}</h2>
      <span style={{ width: 64 }} />
    </header>
  );
}
