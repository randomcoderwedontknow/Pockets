import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import './Sheet.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Full-height sheet (editor) vs compact (quick add). */
  tall?: boolean;
}

export function Sheet({ open, onClose, title, children, tall }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-root" role="presentation">
      <button type="button" className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className={['sheet', tall && 'sheet--tall'].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        {title && (
          <header className="sheet-header">
            <h2>{title}</h2>
            <IconButton onClick={onClose} aria-label="Close">
              <X size={20} />
            </IconButton>
          </header>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
