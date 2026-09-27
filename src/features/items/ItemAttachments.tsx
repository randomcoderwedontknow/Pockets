import { useRef, useState } from 'react';
import { FileText, Paperclip, Trash2 } from 'lucide-react';
import { useVaultStore } from '@/store/vaultStore';
import { ATTACHMENT_ACCEPT } from '@/domain/attachments';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { toast } from '@/components/Toast';
import { openExternalUrl } from '@/platform/openUrl';
import type { ItemAttachment } from '@/domain/types';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  itemId: string;
  attachments: ItemAttachment[];
  editable?: boolean;
}

export function ItemAttachments({ itemId, attachments, editable }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of files) {
      try {
        await useVaultStore.getState().addAttachment(itemId, file);
        toast('Attachment added');
      } catch (e) {
        toast((e as Error).message || 'Could not add file', 'error');
      }
    }
  };

  const openAttachment = async (att: ItemAttachment) => {
    const buf = await useVaultStore.getState().getAttachmentBlob(att.id);
    if (!buf) {
      toast('File missing', 'error');
      return;
    }
    const blob = new Blob([buf], { type: att.mimeType });
    const url = URL.createObjectURL(blob);
    if (att.mimeType.startsWith('image/')) {
      setPreviewUrl(url);
      return;
    }
    if (att.mimeType === 'application/pdf') {
      try {
        await openExternalUrl(url);
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const remove = async (id: string) => {
    await useVaultStore.getState().deleteAttachment(id);
    toast('Attachment removed');
    setDeleteId(null);
  };

  return (
    <section style={{ marginTop: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 650 }}>Attachments</h3>
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <Button variant="soft" icon={<Paperclip size={16} />} onClick={() => inputRef.current?.click()}>
              Add
            </Button>
          </>
        )}
      </div>
      {attachments.length === 0 ? (
        <p className="text-secondary" style={{ fontSize: 14 }}>
          Photos and PDFs stay on this device only.
        </p>
      ) : (
        <div className="list">
          {attachments.map((att) => (
            <button
              key={att.id}
              type="button"
              className="list-item"
              onClick={() => void openAttachment(att)}
              style={{ textAlign: 'left' }}
            >
              <span className="icon-badge icon-badge--soft">
                <FileText size={18} />
              </span>
              <div className="list-item__body">
                <div className="list-item__title">{att.fileName}</div>
                <div className="list-item__subtitle">{formatBytes(att.sizeBytes)}</div>
              </div>
              {editable && (
                <span
                  role="button"
                  tabIndex={0}
                  className="chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(att.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      setDeleteId(att.id);
                    }
                  }}
                  aria-label="Delete attachment"
                >
                  <Trash2 size={16} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {previewUrl && (
        <div
          className="card"
          style={{ marginTop: 12, padding: 8 }}
          role="dialog"
          aria-label="Image preview"
        >
          <img src={previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
          <Button
            variant="ghost"
            block
            style={{ marginTop: 8 }}
            onClick={() => {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }}
          >
            Close preview
          </Button>
        </div>
      )}
      <ConfirmSheet
        open={deleteId !== null}
        title="Remove attachment?"
        message="This file will be deleted from this item."
        confirmLabel="Remove"
        danger
        onConfirm={() => deleteId && void remove(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </section>
  );
}
