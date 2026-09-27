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
import './LockScreen.css';

export function LockScreen() {
  const [mode, setMode] = useState<'idle' | 'passcode'>('idle');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState<{ offer: boolean; label: string }>({ offer: false, label: '' });
  const [useAppPin, setUseAppPin] = useState(true);

  useEffect(() => {
    void (async () => {
      const provider = getAuthProvider();
      const avail = await provider.isAvailable();
      const appBio = await provider.isAppLockEnrolled();
      const { biometricsEnabled } = useSettingsStore.getState();
      setBio({
        offer: biometricsEnabled && avail.available && appBio,
        label: provider.label,
      });
      setUseAppPin(await hasAppLockPin());
    })();
  }, []);

  const unlock = () => useSessionStore.getState().unlockApp();

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
      throw new Error('Set an app lock code in Settings.');
    } catch (e) {
      setError((e as Error).message || 'Could not unlock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lock">
      <div className="lock-brand">
        <Logo size={88} />
        <h1>Pockets is locked</h1>
        <p className="text-secondary">Unlock to open your vault.</p>
      </div>

      {mode === 'idle' && (
        <div className="stack">
          {bio.offer && (
            <Button variant="primary" block icon={<Fingerprint size={18} />} onClick={onBio} disabled={busy}>
              Unlock with {bio.label.toLowerCase()}
            </Button>
          )}
          <Button variant={bio.offer ? 'secondary' : 'primary'} block onClick={() => setMode('passcode')}>
            Use app lock code
          </Button>
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
            <span>App lock code</span>
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
            Unlock
          </Button>
          <Button variant="ghost" block onClick={() => setMode('idle')}>
            Back
          </Button>
        </form>
      )}
    </div>
  );
}
