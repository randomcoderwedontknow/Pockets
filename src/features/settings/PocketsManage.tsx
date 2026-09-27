import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SettingsSubHeader } from './SettingsScreen';
import { useVaultStore, selectPocketItemCount } from '@/store/vaultStore';
import { PocketBadge } from '@/components/icons';
import { Button, IconButton } from '@/components/Button';

export function PocketsManage() {
  const navigate = useSmoothNavigate();
  const pockets = useVaultStore((s) => s.pockets);
  const state = useVaultStore();

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= pockets.length) return;
    const ids = pockets.map((p) => p.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await useVaultStore.getState().reorderPockets(ids);
  };

  return (
    <div className="page page--no-nav">
      <SettingsSubHeader title="Pockets" />
      <div className="list">
        {pockets.map((p, i) => (
          <div key={p.id} className="list-item">
            <PocketBadge icon={p.icon} color={p.color} />
            <button type="button" className="list-item__body" style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0 }} onClick={() => navigate(`/pockets/${p.id}/edit`)}>
              <div className="list-item__title">{p.name}</div>
              <div className="list-item__subtitle">{selectPocketItemCount(state, p.id)} items</div>
            </button>
            <div className="row" style={{ gap: 4 }}>
              <IconButton aria-label="Move up" disabled={i === 0} onClick={() => void move(i, -1)}>
                <ChevronUp size={18} />
              </IconButton>
              <IconButton aria-label="Move down" disabled={i === pockets.length - 1} onClick={() => void move(i, 1)}>
                <ChevronDown size={18} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Button block onClick={() => navigate('/pockets/new')}>
          + Create pocket
        </Button>
      </div>
    </div>
  );
}
