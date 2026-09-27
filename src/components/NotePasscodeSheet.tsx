import { useState } from 'react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { validatePasscode } from '@/security/securityService';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onSubmit: (passcode: string) => void;
}

export function NotePasscodeSheet({
  open,
  title = 'Passcode for this note',
  message = 'This passcode is only for this protected content—not your app unlock code.',
  onClose,
  onSubmit,
}: Props) {
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const v = validatePasscode(passcode);
    if (v) return setError(v);
    if (passcode !== confirm) return setError('Passcodes do not match.');
    onSubmit(passcode);
    setPasscode('');
    setConfirm('');
    setError('');
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        setPasscode('');
        setConfirm('');
        setError('');
      }}
      title={title}
    >
      <p className="text-secondary" style={{ marginBottom: 16 }}>
        {message}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>Passcode</span>
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Confirm</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <Button type="submit" block>
          Continue
        </Button>
      </form>
    </Sheet>
  );
}
