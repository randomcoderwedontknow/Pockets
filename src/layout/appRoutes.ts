export type PrimaryTab = 'home' | 'pockets' | 'search' | 'settings';

const PRIMARY_PATHS = new Set(['/', '/pockets', '/search', '/settings']);

export function isPrimaryTabPath(pathname: string): boolean {
  return PRIMARY_PATHS.has(pathname);
}

/** Which bottom-nav tab is highlighted. */
export function primaryTabForPath(pathname: string): PrimaryTab {
  if (pathname.startsWith('/pockets') || pathname.startsWith('/items')) return 'pockets';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

export function hideBottomNav(pathname: string): boolean {
  return (
    /\/(new|edit)$/.test(pathname) ||
    pathname.startsWith('/items/new') ||
    (pathname.startsWith('/settings/') && pathname.length > '/settings/'.length)
  );
}
