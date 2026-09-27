import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { ChevronLeft, ExternalLink, Heart, Pencil, Pin, Shield, Trash2 } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { PocketBadge } from '@/components/icons';
import { Button, IconButton } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ProtectedValue } from '@/components/ProtectedValue';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { NotePasscodeSheet } from '@/components/NotePasscodeSheet';
import { toast } from '@/components/Toast';
import { useSettingsStore } from '@/store/settingsStore';
import { relativeTime } from '@/lib/format';
import { itemTypeMeta } from '@/domain/itemTypes';
import { usePocketViewProtection } from './usePocketViewProtection';
import { ItemAttachments } from './ItemAttachments';
import { useOpenLinkConfirm } from './useOpenLinkConfirm';
import { extractUrlsFromText } from '@/lib/urls';

export function ItemDetail() {
  const { id } = useParams();
  const navigate = useSmoothNavigate();
  const item = useVaultStore((s) => s.items.find((i) => i.id === id));
  const fields = useVaultStore((s) => (id ? s.fieldsByItem[id] : undefined));
  const pocket = useVaultStore((s) => s.pockets.find((p) => p.id === item?.pocketId));
  const allTags = useVaultStore((s) => s.tags);
  const tags = allTags.filter((t) => item?.tagIds.includes(t.id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [protectText, setProtectText] = useState<string | null>(null);
  const [protectSheet, setProtectSheet] = useState(false);

  useEffect(() => {
    if (id) void useSettingsStore.getState().recordRecentItem(id);
  }, [id]);

  const onProtectSelection = useCallback((req: { text: string }) => {
    setProtectText(req.text);
    setProtectSheet(true);
  }, []);

  const { menu, closeMenu, protectFromMenu } = usePocketViewProtection(true, onProtectSelection);
  const attachments = useVaultStore((s) => (id ? s.attachmentsByItem[id] ?? [] : []));
  const { requestOpen, confirmProps: linkConfirm } = useOpenLinkConfirm();
  const descUrls = item?.description ? extractUrlsFromText(item.description) : [];

  const applyProtect = async (notePasscode: string) => {
    if (!item || !protectText) return;
    const itemFields = fields ?? [];
    const target = itemFields.find((f) => !f.protected && f.value && f.value.includes(protectText));
    if (!target) {
      toast('Select visible text in this note to protect.', 'error');
      return;
    }
    try {
      await useVaultStore.getState().saveItem({
        id: item.id,
        pocketId: item.pocketId,
        type: item.type,
        title: item.title,
        description: item.description,
        tagNames: item.tagIds
          .map((tid) => allTags.find((t) => t.id === tid)?.name ?? '')
          .filter(Boolean),
        favourite: item.favourite,
        pinned: item.pinned,
        protected: item.protected,
        fields: itemFields.map((f) =>
          f.id === target.id
            ? {
                id: f.id,
                name: f.name,
                kind: f.kind,
                protected: true,
                value: f.value,
                notePasscode,
              }
            : {
                id: f.id,
                name: f.name,
                kind: f.kind,
                protected: f.protected,
                value: f.protected ? null : f.value,
                encrypted: f.encrypted,
                ownerRecovery: f.ownerRecovery,
              },
        ),
      });
      toast('Protected with your note passcode', 'secure');
      setProtectText(null);
    } catch (e) {
      toast((e as Error).message || 'Could not protect', 'error');
    }
  };

  if (!item) {
    return (
      <div className="page">
        <EmptyState title="Item not found" action={<Button onClick={() => navigate(-1)}>Back</Button>} />
      </div>
    );
  }

  const itemFields = fields ?? [];
  const urlField = itemFields.find((f) => f.kind === 'url' && !f.protected && f.value);

  const remove = async () => {
    await useVaultStore.getState().deleteItem(item.id);
    toast('Item deleted');
    navigate(-1);
  };

  return (
    <div className="page pocket-view">
      <header className="row" style={{ marginBottom: 8 }}>
        <IconButton aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </IconButton>
        <span className="spacer" />
        <IconButton aria-label="Favourite" onClick={() => useVaultStore.getState().toggleFavourite(item.id)}>
          <Heart size={18} fill={item.favourite ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton aria-label="Pin" onClick={() => useVaultStore.getState().togglePinned(item.id)}>
          <Pin size={18} fill={item.pinned ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton aria-label="Edit" onClick={() => navigate(`/items/${item.id}/edit`)}>
          <Pencil size={18} />
        </IconButton>
      </header>

      <p className="text-tertiary" style={{ fontSize: 13, marginBottom: 6 }}>
        {itemTypeMeta(item.type).label}
      </p>
      <h1 style={{ marginBottom: 8 }}>{item.title}</h1>
      {item.description && <p className="text-secondary" style={{ marginBottom: 12 }}>{item.description}</p>}

      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {pocket && (
          <button type="button" className="chip" onClick={() => navigate(`/pockets/${pocket.id}`)}>
            <PocketBadge icon={pocket.icon} color={pocket.color} size={20} />
            {pocket.name}
          </button>
        )}
        {item.protected && <span className="tag">Protected</span>}
        {tags.map((t) => (
          <span key={t.id} className="tag">
            {t.name}
          </span>
        ))}
      </div>

      <p className="help" style={{ marginBottom: 12 }}>
        Select text, then copy or right-click to protect. Copy is only available here—not from other screens.
      </p>

      <div className="list">
        {itemFields.map((field) => {
          const hidden = field.protected || item.protected;
          return (
            <div key={field.id} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div className="list-item__body">
                <div className="label" style={{ marginBottom: 6 }}>
                  {field.name}
                </div>
                {hidden ? (
                  <ProtectedValue field={field} itemProtected={item.protected} />
                ) : (
                  <div className={field.kind === 'code' ? 'mono' : ''} style={{ wordBreak: 'break-word', userSelect: 'text' }}>
                    {field.value || <span className="text-tertiary">Empty</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {urlField?.value && (
        <div style={{ marginTop: 16 }}>
          <Button variant="soft" block icon={<ExternalLink size={16} />} onClick={() => requestOpen(urlField.value!)}>
            Open link
          </Button>
        </div>
      )}

      {descUrls.length > 0 && (
        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          {descUrls.map((u) => (
            <Button key={u} variant="ghost" block icon={<ExternalLink size={16} />} onClick={() => requestOpen(u)}>
              {u.replace(/^https?:\/\//, '')}
            </Button>
          ))}
        </div>
      )}

      <ItemAttachments itemId={item.id} attachments={attachments} />

      <p className="help" style={{ marginTop: 16 }}>
        Updated {relativeTime(item.updatedAt)} · Created {relativeTime(item.createdAt)}
      </p>

      <div style={{ marginTop: 24 }}>
        <Button variant="danger" block icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>
          Delete item
        </Button>
      </div>

      {menu && (
        <div
          className="card"
          role="menu"
          style={{
            position: 'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 200,
            padding: 8,
            minWidth: 160,
          }}
        >
          <button type="button" className="list-item" onClick={protectFromMenu}>
            <Shield size={16} />
            <span>Protect selection</span>
          </button>
          <button type="button" className="chip" style={{ marginTop: 4 }} onClick={closeMenu}>
            Cancel
          </button>
        </div>
      )}

      <NotePasscodeSheet
        open={protectSheet}
        title="Protect copied text?"
        message="Copying here opens protect instead of the system clipboard. Choose a passcode for this note’s protected text."
        onClose={() => {
          setProtectSheet(false);
          setProtectText(null);
        }}
        onSubmit={(code) => {
          setProtectSheet(false);
          void applyProtect(code);
        }}
      />

      <ConfirmSheet
        open={confirmDelete}
        title="Delete item?"
        message={`Delete “${item.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />

      {linkConfirm && (
        <ConfirmSheet
          open={linkConfirm.open}
          title={linkConfirm.title}
          message={linkConfirm.message}
          confirmLabel={linkConfirm.confirmLabel}
          onConfirm={linkConfirm.onConfirm}
          onClose={linkConfirm.onClose}
        />
      )}
    </div>
  );
}
