import { useCallback, useEffect, useState } from 'react';

export interface ProtectSelectionRequest {
  text: string;
}

/**
 * While viewing a pocket or item: intercept copy and offer protect on selection.
 * Copy is handled in-app only in these views (system copy is suppressed when text is selected).
 */
export function usePocketViewProtection(enabled: boolean, onProtect: (req: ProtectSelectionRequest) => void) {
  const [menu, setMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  const selectionText = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    return sel.toString().trim();
  };

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!enabled) return;

    const onContextMenu = (e: MouseEvent) => {
      const text = selectionText();
      if (!text) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, text });
    };

    const onCopy = (e: ClipboardEvent) => {
      const text = selectionText();
      if (!text) return;
      e.preventDefault();
      onProtect({ text });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const text = selectionText();
        if (!text) return;
        e.preventDefault();
        onProtect({ text });
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, onProtect]);

  const protectFromMenu = () => {
    if (menu) onProtect({ text: menu.text });
    closeMenu();
  };

  return { menu, closeMenu, protectFromMenu };
}
