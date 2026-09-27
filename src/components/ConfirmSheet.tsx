import { Sheet } from './Sheet';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-secondary" style={{ marginBottom: 20 }}>
        {message}
      </p>
      <div className="stack">
        <Button
          variant={danger ? 'danger' : 'primary'}
          block
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
