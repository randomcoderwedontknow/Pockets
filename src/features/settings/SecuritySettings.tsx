import { useEffect, useState } from 'react';
import { SettingsSubHeader } from './SettingsScreen';
import { useSettingsStore } from '@/store/settingsStore';
import { useSessionStore } from '@/store/sessionStore';
import {
  changeAppLockPin,
  hasAppLockPin,
  setupAppLockPin,
  verifyAppLockPin,
} from '@/security/appLockService';
import { validatePasscode } from '@/security/securityService';
import { getAuthProvider } from '@/platform/auth';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toast';
import type { BiometricAvailability } from '@/platform/auth';

export function SecuritySettings() {
  const settings = useSettingsStore();
  const [appLockConfigured, setAppLockConfigured] = useState(false);
  const [bioAvail, setBioAvail] = useState<BiometricAvailability | null>(null);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  const refresh = async () => {
    setAppLockConfigured(await hasAppLockPin());
    const p = getAuthProvider();
    setBioLabel(p.label);
    setBioAvail(await p.isAvailable());
    setBioEnrolled(await p.isAppLockEnrolled());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggle = (key: 'appLock' | 'reauthForProtected' | 'biometricsEnabled', value: boolean) => {
    void useSettingsStore.getState().update({ [key]: value });
  };

  const canLockApp = appLockConfigured || bioEnrolled;

  return (
    <div className="page">
      <SettingsSubHeader title="Security" />

      <AppLockPinBlock configured={appLockConfigured} onChanged={() => void refresh()} />

      <section className="section">
        <div className="section-title">App lock</div>
        <p className="help" style={{ marginBottom: 10 }}>
          App unlock is separate from passcodes on individual notes. Set an app lock code or biometrics here.
        </p>
        <div className="list">
          <ToggleRow
            title="Lock Pockets when leaving the app"
            sub="Requires your app lock code or biometrics to return"
            checked={settings.appLock}
            disabled={!canLockApp}
            onChange={(v) => toggle('appLock', v)}
          />
          <ToggleRow
            title="Ask again for protected items"
            sub="Re-authenticate when showing hidden note values"
            checked={settings.reauthForProtected}
            onChange={(v) => toggle('reauthForProtected', v)}
          />
        </div>
        {settings.appLock && (
          <label className="field" style={{ marginTop: 12 }}>
            <span>Lock after (seconds in background)</span>
            <input
              type="number"
              min={0}
              max={600}
              value={settings.lockGraceSeconds}
              onChange={(e) => useSettingsStore.getState().update({ lockGraceSeconds: Number(e.target.value) || 0 })}
            />
          </label>
        )}
      </section>

      <section className="section">
        <div className="section-title">Biometrics</div>
        <p className="help" style={{ marginBottom: 10 }}>
          {bioAvail
            ? bioAvail.available
              ? bioAvail.detail
              : bioAvail.detail
            : 'Checking device support…'}
        </p>
        <div className="list">
          <ToggleRow
            title={`Allow ${bioLabel.toLowerCase()} for app unlock`}
            sub="Uses the real device prompt — never a fake scanner"
            checked={settings.biometricsEnabled}
            disabled={!bioAvail?.available}
            onChange={(v) => toggle('biometricsEnabled', v)}
          />
        </div>
        {settings.biometricsEnabled && bioAvail?.available && (
          <div style={{ marginTop: 12 }}>
            {bioEnrolled ? (
              <Button
                variant="secondary"
                block
                onClick={async () => {
                  await getAuthProvider().unenrolAppLock();
                  toast('Biometric app unlock turned off');
                  void refresh();
                }}
              >
                Remove biometric app unlock
              </Button>
            ) : (
              <Button
                block
                onClick={async () => {
                  try {
                    await getAuthProvider().enrolAppLock();
                    toast('Biometric app unlock enabled');
                    if (!(await hasAppLockPin())) {
                      toast('Also set an app lock code as backup', 'default');
                    }
                    void refresh();
                  } catch (e) {
                    toast((e as Error).message || 'Could not enable', 'error');
                  }
                }}
              >
                Set up {bioLabel.toLowerCase()} for app unlock
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title">Clipboard</div>
        <label className="field">
          <span>Clear copied protected values after (seconds)</span>
          <input
            type="number"
            min={0}
            max={300}
            value={settings.clipboardClearSeconds}
            onChange={(e) => useSettingsStore.getState().update({ clipboardClearSeconds: Number(e.target.value) || 0 })}
          />
        </label>
        <p className="help">0 keeps the copy. Copying protected text is only offered while viewing a pocket or note.</p>
      </section>

      {canLockApp && (
        <div style={{ marginTop: 24 }}>
          <Button variant="secondary" block onClick={() => useSessionStore.getState().lockApp()}>
            Lock now
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleRow(props: {
  title: string;
  sub: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="list-item">
      <div className="list-item__body">
        <div className="list-item__title">{props.title}</div>
        <div className="list-item__subtitle">{props.sub}</div>
      </div>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        style={{ width: 22, minHeight: 22 }}
      />
    </label>
  );
}

function AppLockPinBlock({ configured, onChanged }: { configured: boolean; onChanged: () => void }) {
  const [mode, setMode] = useState<'idle' | 'create' | 'change'>('idle');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setMode('idle');
    setA('');
    setB('');
    setCurrent('');
    setError('');
  };

  const create = async () => {
    const v = validatePasscode(a);
    if (v) return setError(v);
    if (a !== b) return setError('Codes do not match.');
    try {
      await setupAppLockPin(a);
      toast('App lock code set');
      reset();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const change = async () => {
    const v = validatePasscode(a);
    if (v) return setError(v);
    if (a !== b) return setError('Codes do not match.');
    try {
      if (!(await verifyAppLockPin(current))) return setError('Current app lock code is incorrect.');
      await changeAppLockPin(current, a);
      toast('App lock code updated');
      reset();
      onChanged();
    } catch (e) {
      setError((e as Error).message || 'Could not change app lock code.');
    }
  };

  return (
    <section>
      <div className="section-title">App lock code</div>
      {mode === 'idle' && (
        <Button variant="secondary" block onClick={() => setMode(configured ? 'change' : 'create')}>
          {configured ? 'Change app lock code' : 'Set app lock code'}
        </Button>
      )}
      {mode !== 'idle' && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void (mode === 'create' ? create() : change());
          }}
        >
          {mode === 'change' && (
            <label className="field">
              <span>Current app lock code</span>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>{mode === 'create' ? 'New app lock code' : 'New app lock code'}</span>
            <input type="password" value={a} onChange={(e) => setA(e.target.value)} />
          </label>
          <label className="field">
            <span>Confirm</span>
            <input type="password" value={b} onChange={(e) => setB(e.target.value)} />
          </label>
          {error && <p className="error-text">{error}</p>}
          <Button type="submit" block>
            Save
          </Button>
          <Button variant="ghost" block onClick={reset}>
            Cancel
          </Button>
        </form>
      )}
      <p className="help" style={{ marginTop: 8 }}>
        Used only to open Pockets after locking—not for encrypting notes. Note passcodes are chosen when you protect content.
      </p>
    </section>
  );
}
