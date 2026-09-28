import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import {
  canOfferBiometric,
  cancelAuthentication,
  failAuth,
  getPendingAuth,
  submitBiometric,
  submitPasscode,
  subscribeAuthPrompt,
} from './authFlow';

export function AuthPrompt() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState<{ offer: boolean; label: string }>({ offer: false, label: '' });

  useEffect(() => {
    return subscribeAuthPrompt(() => {
      const req = getPendingAuth();
      setOpen(!!req);
      setReason(req?.reason ?? '');
      setPasscode('');
      setError('');
      if (req) {
        void canOfferBiometric().then((b) => setBio({ offer: b.offer, label: b.label }));
      }
    });
  }, []);

  const onClose = () => {
    cancelAuthentication();
    setOpen(false);
  };

  const onPasscode = async () => {
    setBusy(true);
    setError('');
    try {
      await submitPasscode(passcode);
    } catch (e) {
      setError(failAuth(e) || 'Incorrect passcode.');
    } finally {
      setBusy(false);
    }
  };

  const onBio = async () => {
    setBusy(true);
    setError('');
    try {
      await submitBiometric();
    } catch (e) {
      const msg = failAuth(e);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Unlock">
      <p className="text-secondary" style={{ marginBottom: 16 }}>
        {reason}
      </p>
      {bio.offer && (
        <Button variant="soft" block icon={<Fingerprint size={18} />} onClick={onBio} disabled={busy} style={{ marginBottom: 12 }}>
          Unlock with {bio.label.toLowerCase()}
        </Button>
      )}
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
          Continue
        </Button>
      </form>
    </Sheet>
  );
}
