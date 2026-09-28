import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { failAuth } from './authFlow';
import { verifyAppLockPin, hasAppLockPin } from '@/security/appLockService';
import { verifyOwnerUnlock } from '@/security/ownerUnlockService';
import { unlockWithPasscode, hasPasscode } from '@/security/securityService';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getAuthProvider } from '@/platform/auth';
import { keyHolder } from '@/crypto/keyHolder';
import '../auth/auth.css';
import './LockScreen.css';

interface LockScreenProps {
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  /** Purple liquid backdrop for sign-in gate */
  variant?: 'lock' | 'sign-in';
  onUnlocked?: () => void;
}

export function LockScreen({
  heading = 'Pockets is locked',
  subheading = 'Unlock to open your vault.',
  submitLabel = 'Unlock',
  variant = 'lock',
  onUnlocked,
}: LockScreenProps = {}) {
  const [mode, setMode] = useState<'idle' | 'passcode'>('idle');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState<{ offer: boolean; label: string }>({ offer: false, label: '' });
  const [useAppPin, setUseAppPin] = useState(true);
  const [hasVaultPasscode, setHasVaultPasscode] = useState(false);
  const [canUsePasscode, setCanUsePasscode] = useState(true);

  useEffect(() => {
    void (async () => {
      const provider = getAuthProvider();
      const avail = await provider.isAvailable();
      const appBio = await provider.isAppLockEnrolled();
      const { biometricsEnabled } = useSettingsStore.getState();
      const appPin = await hasAppLockPin();
      const vaultPin = await hasPasscode();
      setBio({
        offer: biometricsEnabled && avail.available && appBio,
        label: provider.label,
      });
      setUseAppPin(appPin);
      setHasVaultPasscode(vaultPin);
      setCanUsePasscode(appPin || vaultPin);
    })();
  }, []);

  const unlock = () => {
    if (onUnlocked) onUnlocked();
    else useSessionStore.getState().unlockApp();
  };

  const onBio = async () => {
    setBusy(true);
    setError('');
    try {
      const provider = getAuthProvider();
      if (await provider.isAppLockEnrolled()) {
        await provider.authenticateAppLock('Unlock Pockets');
        unlock();
        return;
      }
      const result = await provider.authenticate('Unlock Pockets');
      if (result.vaultKey) keyHolder.set(result.vaultKey);
      if (!keyHolder.has()) {
        setError('Use your app lock code to unlock.');
        setMode('passcode');
        return;
      }
      unlock();
    } catch (e) {
      const msg = failAuth(e);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onPasscode = async () => {
    setBusy(true);
    setError('');
    try {
      if (useAppPin) {
        if (await verifyOwnerUnlock(passcode)) {
          unlock();
          return;
        }
        const ok = await verifyAppLockPin(passcode);
        if (!ok) throw new Error('Incorrect app lock code.');
        unlock();
        return;
      }
      if (await hasPasscode()) {
        await unlockWithPasscode(passcode);
        unlock();
        return;
      }
      if (bio.offer) {
        throw new Error('Biometrics did not unlock. Try again, or set a backup app lock code in Settings → Security.');
      }
      throw new Error('Set an app lock code in Settings → Security.');
    } catch (e) {
      setError((e as Error).message || 'Could not unlock.');
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <>
      <div className="lock-brand">
        <Logo size={88} />
        <h1>{heading}</h1>
        <p className="text-secondary">{subheading}</p>
      </div>

      {mode === 'idle' && (
        <div className="stack">
          {bio.offer && (
            <Button variant="primary" block icon={<Fingerprint size={18} />} onClick={onBio} disabled={busy}>
              Unlock with {bio.label.toLowerCase()}
            </Button>
          )}
          {canUsePasscode && (
            <Button variant={bio.offer ? 'secondary' : 'primary'} block onClick={() => setMode('passcode')}>
              {useAppPin ? 'Use app lock code' : 'Use vault passcode'}
            </Button>
          )}
          {!canUsePasscode && bio.offer && (
            <p className="help" style={{ textAlign: 'center' }}>
              Set a backup app lock code in Settings → Security so you are never locked out if biometrics fail.
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      )}

      {mode === 'passcode' && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void onPasscode();
          }}
        >
          <label className="field">
            <span>{useAppPin ? 'App lock code' : hasVaultPasscode ? 'Vault passcode' : 'Passcode'}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <Button type="submit" block disabled={busy || passcode.length < 4}>
            {submitLabel}
          </Button>
          <Button variant="ghost" block onClick={() => setMode('idle')}>
            Back
          </Button>
        </form>
      )}
    </>
  );

  if (variant === 'sign-in') {
    return (
      <div className="auth-scene">
        <div className="auth-scene__inner lock">{content}</div>
      </div>
    );
  }

  return <div className="lock">{content}</div>;
}
