import { isNative } from './platform';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

type Unsub = () => void;

/**
 * Locks the app when it leaves the foreground, honouring the configured
 * grace period. Web: visibilitychange / pagehide. Native: Capacitor
 * App.appStateChange.
 */
export function startLifecycleWatch(): Unsub {
  const onHide = () => {
    const { appLock } = useSettingsStore.getState();
    if (!appLock) return;
    useSessionStore.getState().setBackgroundedAt(Date.now());
  };

  const onShow = () => {
    const { appLock, lockGraceSeconds } = useSettingsStore.getState();
    if (!appLock) return;
    const { backgroundedAt, securityConfigured, lockApp } = useSessionStore.getState();
    if (!securityConfigured) return;
    const elapsed = backgroundedAt == null ? Number.POSITIVE_INFINITY : Date.now() - backgroundedAt;
    if (elapsed >= lockGraceSeconds * 1000) {
      lockApp();
    }
    useSessionStore.getState().setBackgroundedAt(null);
  };

  const vis = () => {
    if (document.visibilityState === 'hidden') onHide();
    else onShow();
  };
  const pagehide = () => onHide();

  document.addEventListener('visibilitychange', vis);
  window.addEventListener('pagehide', pagehide);

  let nativeUnsub: Unsub | null = null;
  if (isNative()) {
    void import('@capacitor/app').then(({ App }) => {
      const handle = App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) onShow();
        else onHide();
      });
      nativeUnsub = () => {
        void handle.then((h) => h.remove());
      };
    });
  }

  return () => {
    document.removeEventListener('visibilitychange', vis);
    window.removeEventListener('pagehide', pagehide);
    nativeUnsub?.();
  };
}
