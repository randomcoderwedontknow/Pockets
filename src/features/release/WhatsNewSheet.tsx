import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { WHATS_NEW_V11_BULLETS, WHATS_NEW_V11_TITLE } from './whatsNewV11';

interface Props {
  open: boolean;
  onContinue: () => void;
}

export function WhatsNewSheet({ open, onContinue }: Props) {
  return (
    <Sheet open={open} onClose={onContinue} title={WHATS_NEW_V11_TITLE} tall>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Logo size={72} />
      </div>
      <ul className="whats-new-list">
        {WHATS_NEW_V11_BULLETS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div style={{ marginTop: 24 }}>
        <Button variant="primary" block onClick={onContinue}>
          Continue
        </Button>
      </div>
    </Sheet>
  );
}
