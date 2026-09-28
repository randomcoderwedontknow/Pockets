import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toast';
import { AVATAR_PRESETS } from '@/domain/localAccount';
import { AvatarBadge } from '@/components/AvatarBadge';
import { useAccountStore } from '@/store/accountStore';
import { useAuthSessionStore } from '@/store/authSessionStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { setupAppLockPin } from '@/security/appLockService';
import { validatePasscode } from '@/security/securityService';
import { getAuthProvider } from '@/platform/auth';
import { Fingerprint } from 'lucide-react';
import './auth.css';

type Step = 'welcome' | 'create' | 'app-lock';

export function AuthGateway() {
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [avatarPreset, setAvatarPreset] = useState<string>(AVATAR_PRESETS[0].id);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  const stepIndex = step === 'welcome' ? 0 : step === 'create' ? 1 : 2;

  const goAppLock = () => {
    if (!displayName.trim()) {
      toast('Enter your name to continue', 'default');
      return;
    }
    setStep('app-lock');
    void (async () => {
      const p = getAuthProvider();
      setBioLabel(p.label);
      const avail = await p.isAvailable();
      setBioAvail(avail.available);
    })();
  };

  const finishSetup = async (enrolBio: boolean) => {
    setPinError('');
    const v = validatePasscode(pin);
    if (v) return setPinError(v);
    if (pin !== pinConfirm) return setPinError('Passcodes do not match.');

    setBusy(true);
    try {
      await setupAppLockPin(pin);
      await useAccountStore.getState().completeProfileSetup({ displayName, avatarPreset });
      await useSettingsStore.getState().update({ appLock: true, biometricsEnabled: enrolBio });
      useSessionStore.getState().setSecurityConfigured(true);
      if (enrolBio && bioAvail) {
        try {
          await getAuthProvider().enrolAppLock();
        } catch (e) {
          toast((e as Error).message || 'Biometrics could not be enabled', 'default');
        }
      }
      useAuthSessionStore.getState().signIn();
      useSessionStore.getState().unlockApp();
    } catch (e) {
      setPinError((e as Error).message || 'Could not finish setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-scene">
      <div className="auth-scene__inner">
        <div className="auth-brand">
          <Logo size={80} />
          {step === 'welcome' && (
            <>
              <h1>Your pocket, your rules</h1>
              <p>Create a local profile on this device. Your pockets stay encrypted here—no cloud account.</p>
            </>
          )}
          {step === 'create' && (
            <>
              <h1>Create your profile</h1>
              <p>Choose how you appear in Pockets. You can change this anytime in Settings.</p>
            </>
          )}
          {step === 'app-lock' && (
            <>
              <h1>Lock your app</h1>
              <p>
                Set an app lock code so only you can open Pockets. This is separate from passcodes on individual notes.
              </p>
            </>
          )}
        </div>

        {step !== 'welcome' && (
          <div className="auth-steps" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={['auth-step-dot', i === stepIndex && 'auth-step-dot--active'].filter(Boolean).join(' ')} />
            ))}
          </div>
        )}

        {step === 'welcome' && (
          <div className="auth-card auth-card--glow stack" style={{ gap: 12 }}>
            <Button block onClick={() => setStep('create')}>
              Create account
            </Button>
            <p className="help" style={{ textAlign: 'center', margin: 0 }}>
              Everything stays on this device—encrypted and under your app lock.
            </p>
          </div>
        )}

        {step === 'create' && (
          <div className="auth-card auth-card--glow stack">
            <label className="field">
              <span>Your name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
              />
            </label>
            <div className="field">
              <span className="label">Avatar</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {AVATAR_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="icon-btn"
                    aria-pressed={avatarPreset === p.id}
                    aria-label={p.label}
                    onClick={() => setAvatarPreset(p.id)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      height: 'auto',
                      border: avatarPreset === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 14,
                      background: 'var(--surface-liquid)',
                    }}
                  >
                    <AvatarBadge preset={p.id} name={displayName || p.label[0]} size={40} />
                  </button>
                ))}
              </div>
            </div>
            <Button block onClick={goAppLock} disabled={!displayName.trim()}>
              Continue
            </Button>
            <Button variant="ghost" block onClick={() => setStep('welcome')}>
              Back
            </Button>
          </div>
        )}

        {step === 'app-lock' && (
          <div className="auth-card auth-card--glow stack">
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void finishSetup(false);
              }}
            >
              <label className="field">
                <span>App lock code</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="At least 4 characters"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Confirm code</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                />
              </label>
              {pinError && <p className="error-text">{pinError}</p>}
              <Button type="submit" block disabled={busy || pin.length < 4}>
                Finish setup
              </Button>
            </form>
            {bioAvail && (
              <Button
                variant="secondary"
                block
                icon={<Fingerprint size={18} />}
                disabled={busy || pin.length < 4}
                onClick={() => void finishSetup(true)}
              >
                Finish and enable {bioLabel.toLowerCase()}
              </Button>
            )}
            <Button variant="ghost" block onClick={() => setStep('create')}>
              Back
            </Button>
          </div>
        )}

        <p className="auth-footer">Pockets · local & encrypted on this device</p>
      </div>
    </div>
  );
}
