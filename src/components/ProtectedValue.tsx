import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import type { Field } from '@/domain/types';
import { NotePasscodeRequiredError, revealField, VaultLockedError } from '@/security/securityService';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { requestAuthentication } from '@/features/lock/authFlow';
import { copyText } from '@/platform/clipboard';
import { NotePasscodeSheet } from './NotePasscodeSheet';
import { toast } from './Toast';

interface Props {
  field: Field;
  /** When the parent item is itself protected. */
  itemProtected?: boolean;
}

/**
 * Hidden representation of a protected field. The decrypted value lives only
 * in this component's local state and is dropped on hide, unmount or lock.
 */
export function ProtectedValue({ field }: Props) {
  const [shown, setShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const locked = useSessionStore((s) => s.locked);
  const hasKey = useSessionStore((s) => s.hasKey);

  useEffect(() => {
    if (locked) setShown(null);
    else if (field.encrypted?.v !== 2 && !hasKey) setShown(null);
  }, [locked, hasKey, field.encrypted?.v]);

  useEffect(() => () => setShown(null), [field.id]);

  const hide = () => setShown(null);

  const revealWithPasscode = async (notePasscode?: string) => {
    setBusy(true);
    try {
      const isNoteLocked = field.encrypted?.v === 2;
      if (!isNoteLocked) {
        const { reauthForProtected, protectedGraceSeconds } = useSettingsStore.getState();
        const fresh = useSessionStore.getState().isAuthFresh(protectedGraceSeconds);
        if (reauthForProtected && !fresh) {
          const ok = await requestAuthentication({ reason: 'Show protected information', requireKey: true });
          if (!ok) return;
        } else if (!hasKey) {
          const ok = await requestAuthentication({ reason: 'Unlock to show this', requireKey: true });
          if (!ok) return;
        }
      }
      const value = await revealField(field, notePasscode);
      setShown(value);
    } catch (e) {
      if (e instanceof NotePasscodeRequiredError) {
        setPasscodeOpen(true);
        return;
      }
      if (e instanceof VaultLockedError) toast('Unlock Pockets first', 'error');
      else toast((e as Error).message || 'Could not reveal value', 'error');
    } finally {
      setBusy(false);
    }
  };

  const show = () => void revealWithPasscode();

  if (shown === null) {
    return (
      <>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="masked" aria-hidden="true">
            ••••••••
          </span>
          <span className="sr-only">Hidden</span>
          <button type="button" className="chip" onClick={show} disabled={busy}>
            <Eye size={16} />
            Show
          </button>
        </div>
        <NotePasscodeSheet
          open={passcodeOpen}
          title="Note passcode"
          message="Enter the passcode you chose when you protected this text."
          onClose={() => setPasscodeOpen(false)}
          onSubmit={(code) => {
            setPasscodeOpen(false);
            void revealWithPasscode(code);
          }}
        />
      </>
    );
  }

  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span className="mono" style={{ wordBreak: 'break-word', flex: 1 }}>
        {shown}
      </span>
      <button
        type="button"
        className="chip"
        onClick={async () => {
          const secs = useSettingsStore.getState().clipboardClearSeconds;
          await copyText(shown, { secure: true, clearAfterMs: secs * 1000 });
          toast('Copied securely', 'secure');
        }}
        aria-label="Copy securely"
      >
        <Copy size={16} />
      </button>
      <button type="button" className="chip" onClick={hide}>
        <EyeOff size={16} />
      </button>
    </div>
  );
}
