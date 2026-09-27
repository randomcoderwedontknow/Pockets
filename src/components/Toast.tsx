import { create } from 'zustand';
import { useEffect } from 'react';
import './Toast.css';

interface Toast {
  id: number;
  message: string;
  tone?: 'default' | 'secure' | 'error';
}

interface ToastState {
  toasts: Toast[];
  show(message: string, tone?: Toast['tone']): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show(message, tone = 'default') {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    window.setTimeout(() => get().dismiss(id), 2400);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function toast(message: string, tone?: Toast['tone']) {
  useToasts.getState().show(message, tone);
}

export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  useEffect(() => undefined, [toasts]);
  if (!toasts.length) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
