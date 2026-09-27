import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { Pin, Search } from 'lucide-react';
import { useVaultStore, selectPocketItemCount } from '@/store/vaultStore';
import { useAccountStore } from '@/store/accountStore';
import { useSettingsStore } from '@/store/settingsStore';
import { greeting, relativeTime } from '@/lib/format';
import { PocketBadge } from '@/components/icons';
import { Button } from '@/components/Button';
import './HomeScreen.css';

export function HomeScreen({ onAdd }: { onAdd: () => void }) {
  const navigate = useSmoothNavigate();
  const pockets = useVaultStore((s) => s.pockets);
  const items = useVaultStore((s) => s.items);
  const state = useVaultStore();
  const displayName = useAccountStore((s) => s.displayName);
  const recentIds = useSettingsStore((s) => s.recentItemIds);

  const pinned = useMemo(() => items.filter((i) => i.pinned).slice(0, 8), [items]);

  const recent = useMemo(() => {
    if (items.length === 0) return [];
    return recentIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean)
      .slice(0, 5) as typeof items;
  }, [items, recentIds]);

  const headline = displayName.trim() ? `${greeting()}, ${displayName.trim()}` : greeting();

  return (
    <div className="page home">
      <header className="home-hero">
        <p className="home-kicker">Pockets</p>
        <h1>{headline}</h1>
      </header>

      <button type="button" className="home-search" onClick={() => navigate('/search')}>
        <Search size={18} />
        <span>Search your pockets</span>
      </button>

      {pinned.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>Pinned</span>
            <Pin size={14} />
          </div>
          <div className="pin-grid">
            {pinned.map((item) => {
              const pocket = pockets.find((p) => p.id === item.pocketId);
              return (
                <Link key={item.id} to={`/items/${item.id}`} className="card card--interactive pin-card">
                  <span className="pin-card__title truncate">{item.title}</span>
                  <span className="pin-card__meta truncate">{pocket?.name ?? ''}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span>Recent</span>
          </div>
          <div className="list">
            {recent.map((item) => {
              const pocket = pockets.find((p) => p.id === item.pocketId);
              return (
                <Link key={item.id} to={`/items/${item.id}`} className="list-item">
                  <div className="list-item__body">
                    <div className="list-item__title">{item.title}</div>
                    <div className="list-item__subtitle">{pocket?.name ?? ''}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-title">
          <span>Your pockets</span>
          {pockets.length > 0 && (
            <Link to="/pockets" className="text-secondary" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
              See all
            </Link>
          )}
        </div>
        {pockets.length === 0 ? (
          <p className="text-secondary" style={{ fontSize: 15, marginBottom: 12 }}>
            You have no pockets yet. Create one to start saving information.
          </p>
        ) : (
          <div className="list">
            {pockets.slice(0, 8).map((p) => {
              const count = selectPocketItemCount(state, p.id);
              return (
                <Link key={p.id} to={`/pockets/${p.id}`} className="list-item">
                  <PocketBadge icon={p.icon} color={p.color} />
                  <div className="list-item__body">
                    <div className="list-item__title">{p.name}</div>
                    <div className="list-item__subtitle">
                      {count} {count === 1 ? 'item' : 'items'}
                      {p.updatedAt ? ` · ${relativeTime(p.updatedAt)}` : ''}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {pockets.length === 0 && (
          <Button block variant="soft" onClick={() => navigate('/pockets/new')}>
            Create Pocket
          </Button>
        )}
      </section>

      {pockets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Button block onClick={onAdd}>
            + Add
          </Button>
        </div>
      )}
    </div>
  );
}
