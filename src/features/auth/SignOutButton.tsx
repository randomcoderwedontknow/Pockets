import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { signOutDevice } from './signOutDevice';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  block?: boolean;
  /** Also clear PWA/service worker cache (keeps your vault in IndexedDB). */
  clearWebCache?: boolean;
  label?: string;
}

export function SignOutButton({
  variant = 'secondary',
  block = true,
  clearWebCache = false,
  label = 'Sign out',
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await signOutDevice({ clearWebCache, reload: true });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        block={block}
        icon={<LogOut size={18} />}
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <ConfirmSheet
        open={open}
        title="Sign out on this device?"
        message={
          clearWebCache
            ? 'You will need to sign in again with your app lock. Web cache will be cleared; your pockets stay on this device.'
            : 'You will return to the sign-in screen. Your pockets and app lock stay on this device.'
        }
        confirmLabel={busy ? 'Signing out…' : 'Sign out'}
        danger
        onConfirm={() => void confirm()}
        onClose={() => !busy && setOpen(false)}
      />
    </>
  );
}
