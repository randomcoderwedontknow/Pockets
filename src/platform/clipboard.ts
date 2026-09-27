import { isNative } from './platform';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

async function write(text: string) {
  if (isNative()) {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Last-resort fallback for older WebViews.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

async function current(): Promise<string> {
  try {
    if (isNative()) {
      const { Clipboard } = await import('@capacitor/clipboard');
      const r = await Clipboard.read();
      return r.value ?? '';
    }
    return (await navigator.clipboard?.readText?.()) ?? '';
  } catch {
    return '';
  }
}

/**
 * Copies `text`. When `secure` is true the clipboard is cleared after
 * `clearAfterMs` if it still holds the same value (best-effort: browsers
 * often refuse clipboard reads without a gesture).
 */
export async function copyText(text: string, opts?: { secure?: boolean; clearAfterMs?: number }): Promise<void> {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  await write(text);
  if (opts?.secure && (opts.clearAfterMs ?? 0) > 0) {
    const snapshot = text;
    clearTimer = setTimeout(async () => {
      clearTimer = null;
      const now = await current();
      if (now === snapshot) {
        try {
          await write('');
        } catch {
          /* ignore */
        }
      }
    }, opts.clearAfterMs);
  }
}
