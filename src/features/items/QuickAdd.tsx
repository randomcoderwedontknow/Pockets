import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ITEM_TYPES } from '@/domain/itemTypes';
import { ITEM_TYPE_ICONS } from '@/components/icons';
import { Sheet } from '@/components/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  pocketId?: string | null;
}

export function QuickAdd({ open, onClose, pocketId }: Props) {
  const navigate = useNavigate();

  const pick = (type: string) => {
    const q = new URLSearchParams({ type });
    if (pocketId) q.set('pocket', pocketId);
    onClose();
    navigate(`/items/new?${q.toString()}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="What are you saving?">
      <div className="list" style={{ marginTop: 8 }}>
        {ITEM_TYPES.map((t) => {
          const Icon = ITEM_TYPE_ICONS[t.type];
          return (
            <button key={t.type} type="button" className="list-item" onClick={() => pick(t.type)}>
              <span className="icon-badge icon-badge--soft" style={{ '--badge-color': 'var(--accent)' } as CSSProperties}>
                <Icon size={18} />
              </span>
              <div className="list-item__body">
                <div className="list-item__title">{t.label}</div>
                <div className="list-item__subtitle">{t.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
