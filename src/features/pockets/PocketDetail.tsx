import { useMemo, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronLeft, Pencil, Plus, Star } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { PocketBadge, ITEM_TYPE_ICONS } from '@/components/icons';
import { EmptyState } from '@/components/EmptyState';
import { Button, IconButton } from '@/components/Button';
import { relativeTime } from '@/lib/format';

export function PocketDetail({ onAdd }: { onAdd: (pocketId: string) => void }) {
  const { id } = useParams();
  const navigate = useSmoothNavigate();
  const pocket = useVaultStore((s) => s.pockets.find((p) => p.id === id));
  const allItems = useVaultStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.pocketId === id), [allItems, id]);

  if (!pocket) {
    return (
      <div className="page">
        <EmptyState title="Pocket not found" action={<Button onClick={() => navigate('/pockets')}>Back</Button>} />
      </div>
    );
  }

  return (
    <div className="page pocket-view">
      <header className="row" style={{ marginBottom: 8 }}>
        <IconButton aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </IconButton>
        <span className="spacer" />
        <IconButton aria-label="Edit pocket" onClick={() => navigate(`/pockets/${pocket.id}/edit`)}>
          <Pencil size={18} />
        </IconButton>
      </header>

      <div className="row" style={{ marginBottom: 20, gap: 14 }}>
        <PocketBadge icon={pocket.icon} color={pocket.color} size={56} />
        <div>
          <h1>{pocket.name}</h1>
          <p className="text-secondary">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="pocket"
          title="Nothing here yet"
          body="Add the first item to this pocket."
          action={
            <Button block onClick={() => onAdd(pocket.id)}>
              + Add item
            </Button>
          }
        />
      ) : (
        <div className="list">
          {items.map((item) => {
            const Icon = ITEM_TYPE_ICONS[item.type];
            return (
              <Link key={item.id} to={`/items/${item.id}`} className="list-item">
                <span className="icon-badge icon-badge--soft" style={{ '--badge-color': 'var(--accent)' } as CSSProperties}>
                  <Icon size={18} />
                </span>
                <div className="list-item__body">
                  <div className="list-item__title row" style={{ gap: 6 }}>
                    {item.title}
                    {item.favourite && <Star size={14} fill="currentColor" />}
                    {item.protected && <span className="tag">Protected</span>}
                  </div>
                  <div className="list-item__subtitle">
                    {item.description || relativeTime(item.updatedAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Button block icon={<Plus size={18} />} onClick={() => onAdd(pocket.id)}>
          Add item
        </Button>
      </div>
    </div>
  );
}
