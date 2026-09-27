import { Link } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { HelpCircle, Plus } from 'lucide-react';
import { useVaultStore, selectPocketItemCount } from '@/store/vaultStore';
import { PocketBadge } from '@/components/icons';
import { EmptyState } from '@/components/EmptyState';
import { Button, IconButton } from '@/components/Button';
import { relativeTime } from '@/lib/format';

export function PocketsScreen() {
  const navigate = useSmoothNavigate();
  const pockets = useVaultStore((s) => s.pockets);
  const state = useVaultStore();

  return (
    <div className="page">
      <header className="row" style={{ marginBottom: 20 }}>
        <h1>Pockets</h1>
        <span className="spacer" />
        {pockets.length > 0 && (
          <IconButton aria-label="New pocket" onClick={() => navigate('/pockets/new')}>
            <Plus size={22} />
          </IconButton>
        )}
      </header>

      {pockets.length === 0 ? (
        <EmptyState
          variant="pockets"
          hero
          title="Create your first Pocket"
          body="A Pocket is a container for related information — devices, links, records, or anything you want to keep together."
          action={
            <Button block onClick={() => navigate('/pockets/new')}>
              Create Pocket
            </Button>
          }
          secondary={
            <Button variant="ghost" icon={<HelpCircle size={16} />} onClick={() => navigate('/settings/tutorial')}>
              Help & tutorial
            </Button>
          }
        />
      ) : (
        <div className="list">
          {pockets.map((p) => {
            const count = selectPocketItemCount(state, p.id);
            return (
              <Link key={p.id} to={`/pockets/${p.id}`} className="list-item">
                <PocketBadge icon={p.icon} color={p.color} />
                <div className="list-item__body">
                  <div className="list-item__title">{p.name}</div>
                  <div className="list-item__subtitle">
                    {count} {count === 1 ? 'item' : 'items'} · {relativeTime(p.updatedAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
