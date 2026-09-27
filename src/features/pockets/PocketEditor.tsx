import { useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronLeft } from 'lucide-react';
import { POCKET_COLORS, POCKET_ICONS } from '@/domain/pocketMeta';
import type { PocketColor } from '@/domain/types';
import { useVaultStore } from '@/store/vaultStore';
import { PocketGlyph } from '@/components/icons';
import { Button, IconButton } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { toast } from '@/components/Toast';

export function PocketEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromTutorial = searchParams.get('tutorial') === '1';
  const navigate = useSmoothNavigate();
  const existing = useVaultStore((s) => s.pockets.find((p) => p.id === id));
  const pockets = useVaultStore((s) => s.pockets);
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'folder');
  const [color, setColor] = useState<PocketColor>(existing?.color ?? 'lavender');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !existing && !id;

  const save = async () => {
    setBusy(true);
    try {
      if (existing) {
        await useVaultStore.getState().updatePocket(existing.id, { name, icon, color });
        toast('Pocket updated');
        navigate(-1);
      } else {
        const pocket = await useVaultStore.getState().createPocket({ name, icon, color });
        toast('Pocket created');
        if (fromTutorial) navigate('/settings/tutorial?step=3', { replace: true });
        else navigate(`/pockets/${pocket.id}`, { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const others = pockets.filter((p) => p.id !== existing.id);
    const moveTo = others[0]?.id;
    await useVaultStore.getState().deletePocket(existing.id, moveTo ? { moveTo } : 'delete-items');
    toast('Pocket deleted');
    navigate('/pockets', { replace: true });
  };

  const deleteMessage = existing
    ? othersMessage(pockets, existing.id)
    : '';

  return (
    <div className="page page--no-nav">
      <header className="row" style={{ marginBottom: 16 }}>
        <IconButton aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </IconButton>
        <h2 style={{ flex: 1 }}>{isNew ? 'New pocket' : 'Edit pocket'}</h2>
      </header>

      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home" autoFocus />
        </label>

        <div className="field">
          <span className="label">Colour</span>
          <div className="chip-row">
            {POCKET_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                className="chip"
                aria-pressed={color === c.key}
                onClick={() => setColor(c.key)}
                style={{ '--swatch': `var(${c.cssVar})` } as CSSProperties}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: `var(${c.cssVar})`,
                    display: 'inline-block',
                  }}
                />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Icon</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {POCKET_ICONS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className="icon-btn"
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  height: 'auto',
                  background: icon === key ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: icon === key ? 'var(--accent-soft-text)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}
                aria-label={key}
              >
                <PocketGlyph name={key} />
              </button>
            ))}
          </div>
        </div>

        <Button block onClick={save} disabled={busy || !name.trim()}>
          Save
        </Button>
        {existing && (
          <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
            Delete pocket
          </Button>
        )}
      </div>

      {existing && (
        <ConfirmSheet
          open={confirmDelete}
          title="Delete pocket?"
          message={deleteMessage}
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function othersMessage(pockets: { id: string; name: string }[], id: string): string {
  const others = pockets.filter((p) => p.id !== id);
  const moveTo = others[0];
  const pocket = pockets.find((p) => p.id === id);
  if (!pocket) return '';
  if (moveTo) return `Delete “${pocket.name}”? Items will move to ${moveTo.name}.`;
  return `Delete “${pocket.name}” and all of its items?`;
}
