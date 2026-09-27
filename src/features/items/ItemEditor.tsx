import { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import type { FieldDraft, FieldKind, ItemType } from '@/domain/types';
import { DEVICE_PRESETS, itemTypeMeta } from '@/domain/itemTypes';
import { useVaultStore } from '@/store/vaultStore';
import { hasPasscode } from '@/security/securityService';
import { useSessionStore } from '@/store/sessionStore';
import { requestAuthentication } from '@/features/lock/authFlow';
import { Button, IconButton } from '@/components/Button';
import { NotePasscodeSheet } from '@/components/NotePasscodeSheet';
import { toast } from '@/components/Toast';
import { ItemAttachments } from './ItemAttachments';

function blankField(): FieldDraft {
  return { name: '', kind: 'text', protected: false, value: '' };
}

export function ItemEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useSmoothNavigate();
  const existing = useVaultStore((s) => s.items.find((i) => i.id === id));
  const existingFields = useVaultStore((s) => (id ? s.fieldsByItem[id] : undefined));
  const pockets = useVaultStore((s) => s.pockets);
  const tags = useVaultStore((s) => s.tags);
  const attachments = useVaultStore((s) => (id ? s.attachmentsByItem[id] ?? [] : []));

  const initialType = (params.get('type') as ItemType) || existing?.type || 'note';
  const meta = itemTypeMeta(initialType);

  const [type] = useState<ItemType>(initialType);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [pocketId, setPocketId] = useState(existing?.pocketId ?? params.get('pocket') ?? pockets[0]?.id ?? '');
  const [tagNames, setTagNames] = useState(
    existing ? existing.tagIds.map((tid) => tags.find((t) => t.id === tid)?.name ?? '').filter(Boolean).join(', ') : '',
  );
  const [favourite, setFavourite] = useState(existing?.favourite ?? false);
  const [pinned, setPinned] = useState(existing?.pinned ?? false);
  const [itemProtected, setItemProtected] = useState(existing?.protected ?? meta.defaultProtected);

  useEffect(() => {
    if (!existing && pockets.length === 0) {
      toast('Create a pocket first');
      navigate('/pockets/new', { replace: true });
    }
  }, [existing, pockets.length, navigate]);

  const [fields, setFields] = useState<FieldDraft[]>(() => {
    if (existing && existingFields) {
      return existingFields.map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        protected: f.protected,
        value: f.protected ? null : (f.value ?? ''),
        encrypted: f.encrypted,
      }));
    }
    return meta.template();
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notePasscodePrompt, setNotePasscodePrompt] = useState(false);

  const updateField = (idx: number, patch: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const applyPreset = (key: string) => {
    const names = DEVICE_PRESETS[key];
    if (!names) return;
    setTitle((t) => t || key);
    setFields(names.map((n) => ({ name: n, kind: n === 'Notes' ? 'multiline' : 'text', protected: false, value: '' })));
  };

  const save = async (notePasscode?: string) => {
    setBusy(true);
    setError('');
    try {
      const needsProtect = itemProtected || fields.some((f) => f.protected);
      const needsNewNotePasscode =
        needsProtect &&
        fields.some((f) => (f.protected || itemProtected) && f.value !== null && (!f.encrypted || f.encrypted.v !== 2));

      if (needsNewNotePasscode && !notePasscode) {
        setNotePasscodePrompt(true);
        return;
      }

      if (needsProtect && !notePasscode && (await hasPasscode()) && !useSessionStore.getState().hasKey) {
        const ok = await requestAuthentication({ reason: 'Unlock to protect this information', requireKey: true });
        if (!ok) return;
      }

      await useVaultStore.getState().saveItem({
        id: existing?.id,
        pocketId,
        type,
        title,
        description,
        tagNames: tagNames.split(/[,#]/).map((s) => s.trim()).filter(Boolean),
        favourite,
        pinned,
        protected: itemProtected,
        fields: fields.map((f) => ({
          ...f,
          value: f.value === '' && f.encrypted ? null : f.value,
          notePasscode: needsNewNotePasscode && (f.protected || itemProtected) && f.value !== null ? notePasscode : undefined,
        })),
      });
      toast(existing ? 'Saved' : 'Added');
      navigate(existing ? `/items/${existing.id}` : location.state?.from ?? '/', { replace: !existing });
    } catch (e) {
      setError((e as Error).message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="row" style={{ marginBottom: 16 }}>
        <IconButton aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </IconButton>
        <h2 style={{ flex: 1 }}>{existing ? 'Edit item' : 'New entry'}</h2>
      </header>

      <div className="stack">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give this a name" autoFocus />
        </label>

        <label className="field">
          <span>Pocket</span>
          <select value={pocketId} onChange={(e) => setPocketId(e.target.value)}>
            {pockets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
        </label>

        {type === 'device' && !existing && (
          <div className="chip-row">
            {Object.keys(DEVICE_PRESETS).map((k) => (
              <button key={k} type="button" className="chip" onClick={() => applyPreset(k)}>
                {k} preset
              </button>
            ))}
          </div>
        )}

        <div className="section-title" style={{ marginTop: 8 }}>
          Fields
        </div>
        {fields.map((f, idx) => (
          <div key={f.id ?? idx} className="card" style={{ padding: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <input
                value={f.name}
                onChange={(e) => updateField(idx, { name: e.target.value })}
                placeholder="Field name"
                aria-label="Field name"
              />
              <IconButton aria-label="Remove field" onClick={() => setFields((prev) => prev.filter((_, i) => i !== idx))}>
                <Trash2 size={16} />
              </IconButton>
            </div>
            {f.kind === 'multiline' ? (
              <textarea
                value={f.value ?? ''}
                onChange={(e) => updateField(idx, { value: e.target.value })}
                placeholder={f.protected && f.value === null ? 'Leave blank to keep existing value' : 'Value'}
              />
            ) : (
              <input
                value={f.value ?? ''}
                onChange={(e) => updateField(idx, { value: e.target.value })}
                placeholder={f.protected && f.value === null ? 'Leave blank to keep existing value' : 'Value'}
                type={f.kind === 'url' ? 'url' : 'text'}
              />
            )}
            <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
              <select
                value={f.kind}
                onChange={(e) => updateField(idx, { kind: e.target.value as FieldKind })}
                style={{ minHeight: 40, width: 'auto' }}
              >
                <option value="text">Text</option>
                <option value="multiline">Long text</option>
                <option value="url">URL</option>
                <option value="code">Code</option>
              </select>
              <label className="row" style={{ fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={f.protected || itemProtected}
                  disabled={itemProtected}
                  onChange={(e) => updateField(idx, { protected: e.target.checked, value: e.target.checked && f.encrypted ? null : f.value })}
                  style={{ width: 20, minHeight: 20, padding: 0 }}
                />
                Protect
              </label>
            </div>
          </div>
        ))}
        <Button variant="secondary" block icon={<Plus size={16} />} onClick={() => setFields((p) => [...p, blankField()])}>
          Add field
        </Button>

        <label className="field">
          <span>Tags</span>
          <input value={tagNames} onChange={(e) => setTagNames(e.target.value)} placeholder="home, work" />
        </label>

        <label className="row">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: 20, minHeight: 20 }} />
          Pin to home
        </label>
        <label className="row">
          <input type="checkbox" checked={favourite} onChange={(e) => setFavourite(e.target.checked)} style={{ width: 20, minHeight: 20 }} />
          Favourite
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={itemProtected}
            onChange={(e) => setItemProtected(e.target.checked)}
            style={{ width: 20, minHeight: 20 }}
          />
          Protect this item
        </label>
        <p className="help">Protected values are encrypted and stay hidden until you authenticate.</p>

        {id && <ItemAttachments itemId={id} attachments={attachments} editable />}

        {error && <p className="error-text">{error}</p>}
        <Button block onClick={() => void save()} disabled={busy || !title.trim() || !pocketId}>
          Save
        </Button>
      </div>

      <NotePasscodeSheet
        open={notePasscodePrompt}
        onClose={() => setNotePasscodePrompt(false)}
        onSubmit={(code) => {
          setNotePasscodePrompt(false);
          void save(code);
        }}
      />
    </div>
  );
}
