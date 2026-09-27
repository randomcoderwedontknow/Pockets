import { Logo } from '@/components/Logo';
import { SettingsSubHeader } from './SettingsScreen';

export function AboutSettings() {
  return (
    <div className="page">
      <SettingsSubHeader title="About" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '24px 0' }}>
        <Logo size={96} />
        <h2>Pockets</h2>
        <p className="text-secondary">Your important information, always in your pocket.</p>
        <p className="help">Version 1.0.0</p>
      </div>
      <div className="list">
        <div className="list-item">
          <div className="list-item__body">
            <div className="list-item__title">Credits</div>
            <div className="list-item__subtitle">Designed for everyday use on Android, starting with the Galaxy A05.</div>
          </div>
        </div>
        <div className="list-item">
          <div className="list-item__body">
            <div className="list-item__title">Privacy</div>
            <div className="list-item__subtitle">
              Pockets stores data on this device. Nothing is sent to a server or to an AI service.
              Security features are real, but no app can promise that information is perfectly safe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
