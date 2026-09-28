import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { whatsNewForVersion } from './whatsNewContent';

interface Props {
  open: boolean;
  onContinue: () => void;
}

export function WhatsNewSheet({ open, onContinue }: Props) {
  const { title, bullets } = whatsNewForVersion();
  return (
    <Sheet open={open} onClose={onContinue} title={title} tall>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Logo size={72} />
      </div>
      <ul className="whats-new-list">
        {bullets.map((line) => (
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
