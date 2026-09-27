import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEM_TYPES } from '@/domain/itemTypes';
import type { ItemType } from '@/domain/types';
import { buildIndex, search, type SearchFilters } from '@/search/searchIndex';
import { useVaultStore } from '@/store/vaultStore';
import { PocketBadge, ITEM_TYPE_ICONS } from '@/components/icons';
import { EmptyState } from '@/components/EmptyState';

export function SearchScreen() {
  const pockets = useVaultStore((s) => s.pockets);
  const items = useVaultStore((s) => s.items);
  const fieldsByItem = useVaultStore((s) => s.fieldsByItem);
  const tags = useVaultStore((s) => s.tags);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  const index = useMemo(() => buildIndex(items, fieldsByItem, pockets, tags), [items, fieldsByItem, pockets, tags]);
  const results = useMemo(
    () => search(q, index, items, filters, fieldsByItem),
    [q, index, items, filters, fieldsByItem],
  );

  const toggle = (patch: SearchFilters) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      for (const k of Object.keys(patch) as (keyof SearchFilters)[]) {
        if (f[k] === patch[k]) (next as Record<string, unknown>)[k] = undefined;
      }
      return next;
    });
  };

  return (
    <div className="page">
      <h1 style={{ marginBottom: 12 }}>Search</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Titles, fields, tags…"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      <div className="chip-row" style={{ margin: '12px 0' }}>
        {pockets.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={filters.pocketId === p.id}
            onClick={() => toggle({ pocketId: p.id })}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 16 }}>
        {ITEM_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            className="chip"
            aria-pressed={filters.type === t.type}
            onClick={() => toggle({ type: t.type as ItemType })}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={!!filters.favourite} onClick={() => toggle({ favourite: true })}>
          Favourites
        </button>
        <button type="button" className="chip" aria-pressed={!!filters.pinned} onClick={() => toggle({ pinned: true })}>
          Pinned
        </button>
        <button type="button" className="chip" aria-pressed={!!filters.protected} onClick={() => toggle({ protected: true })}>
          Protected
        </button>
      </div>

      {results.length === 0 ? (
        <EmptyState
          variant={q ? 'default' : 'search'}
          title={q ? 'Nothing matches' : 'Search your pockets'}
          body={
            q
              ? 'Try a different word or clear a filter.'
              : 'Titles, field names, tags and visible values. Protected information is never searchable.'
          }
        />
      ) : (
        <div className="list">
          {results.map(({ item, matchedField }) => {
            const pocket = pockets.find((p) => p.id === item.pocketId);
            const Icon = ITEM_TYPE_ICONS[item.type];
            return (
              <Link key={item.id} to={`/items/${item.id}`} className="list-item">
                {pocket ? (
                  <PocketBadge icon={pocket.icon} color={pocket.color} size={40} />
                ) : (
                  <span className="icon-badge icon-badge--soft">
                    <Icon size={18} />
                  </span>
                )}
                <div className="list-item__body">
                  <div className="list-item__title">{item.title}</div>
                  <div className="list-item__subtitle truncate">
                    {pocket?.name}
                    {matchedField ? ` → ${matchedField.name} → ${matchedField.value}` : item.description ? ` · ${item.description}` : ''}
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
