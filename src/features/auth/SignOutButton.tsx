import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { signOutDevice } from './signOutDevice';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  block?: boolean;
  /** Also clear PWA/service worker cache after removing local data. */
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
        title="Sign out and start over?"
        message={
          clearWebCache
            ? 'All pockets and your app lock on this device will be erased. You can create a new account next. Web cache will be cleared too. Export a backup first from Settings → Data if you need one.'
            : 'All pockets and your app lock on this device will be erased so you can create a new account. Export a backup first from Settings → Data if you need one.'
        }
        confirmLabel={busy ? 'Signing out…' : 'Sign out'}
        danger
        onConfirm={() => void confirm()}
        onClose={() => !busy && setOpen(false)}
      />
    </>
  );
}
