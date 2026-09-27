import { flushSync } from 'react-dom';
import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

export function withViewTransition(update: () => void): void {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    document.startViewTransition(() => {
      flushSync(update);
    });
  } else {
    update();
  }
}

export function smoothNavigate(navigate: NavigateFunction, to: To | number, options?: NavigateOptions): void {
  withViewTransition(() => {
    if (typeof to === 'number') navigate(to);
    else navigate(to, options);
  });
}

/** Same-origin in-app anchor (React Router Link, NavLink, etc.). */
export function handleInAppAnchorClick(
  e: MouseEvent,
  navigate: NavigateFunction,
): boolean {
  if (e.defaultPrevented) return false;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;

  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#')) return false;

  let path = raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const url = new URL(raw);
    if (url.origin !== window.location.origin) return false;
    path = url.pathname + url.search + url.hash;
  }

  const current = window.location.pathname + window.location.search + window.location.hash;
  if (path === current) {
    e.preventDefault();
    return true;
  }

  e.preventDefault();
  const replace = anchor.getAttribute('data-replace') === 'true';
  smoothNavigate(navigate, path, replace ? { replace: true } : undefined);
  return true;
}
