import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { BottomNav } from '@/components/BottomNav';
import { ToastHost } from '@/components/Toast';
import { AppShell } from '@/layout/AppShell';
import { hideBottomNav } from '@/layout/appRoutes';
import { LockScreen } from '@/features/lock/LockScreen';
import { toast } from '@/components/Toast';
import { useAccountStore } from '@/store/accountStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { AuthPrompt } from '@/features/lock/AuthPrompt';
import { useVaultStore } from '@/store/vaultStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSessionStore } from '@/store/sessionStore';
import { hasAppLockPin } from '@/security/appLockService';
import { getAuthProvider } from '@/platform/auth';
import { startLifecycleWatch } from '@/platform/lifecycle';

export function App() {
  const loaded = useVaultStore((s) => s.loaded);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const accountLoaded = useAccountStore((s) => s.loaded);
  const tutorialLoaded = useTutorialStore((s) => s.loaded);
  const pocketCount = useVaultStore((s) => s.pockets.length);
  const locked = useSessionStore((s) => s.locked);
  const location = useLocation();
  const navigate = useSmoothNavigate();

  useEffect(() => {
    void (async () => {
      await useSettingsStore.getState().load();
      await useVaultStore.getState().load();
      await useAccountStore.getState().load();
      await useTutorialStore.getState().load();
      const appPin = await hasAppLockPin();
      const bio = await getAuthProvider().isAppLockEnrolled();
      useSessionStore.getState().setSecurityConfigured(appPin || bio);
      const { appLock } = useSettingsStore.getState();
      if (appLock && (appPin || bio)) {
        useSessionStore.getState().lockApp();
      }
    })();
    return startLifecycleWatch();
  }, []);

  const openAdd = (pocketId?: string) => {
    if (pocketCount === 0) {
      toast('Create a pocket first', 'default');
      return;
    }
    const q = new URLSearchParams();
    if (pocketId) q.set('pocket', pocketId);
    navigate(`/items/new?${q.toString()}`);
  };

  if (!loaded || !settingsLoaded || !accountLoaded || !tutorialLoaded) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <p className="text-secondary">Opening Pockets…</p>
      </div>
    );
  }

  if (locked) {
    return (
      <>
        <LockScreen />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="app-root">
      <AppShell openAdd={openAdd} />
      {!hideBottomNav(location.pathname) && <BottomNav onAdd={() => openAdd()} />}
      <AuthPrompt />
      <ToastHost />
    </div>
  );
}
