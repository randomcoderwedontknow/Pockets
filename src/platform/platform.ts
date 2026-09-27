import { Capacitor } from '@capacitor/core';

export type PlatformName = 'web' | 'android' | 'ios';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function platformName(): PlatformName {
  const p = Capacitor.getPlatform();
  if (p === 'android' || p === 'ios') return p;
  return 'web';
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
