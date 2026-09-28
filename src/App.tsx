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
import { ensureOwnerUnlockSeeded } from '@/security/ownerUnlockService';
import { runV11OwnerRecoveryMigration } from '@/migrations/v11OwnerRecovery';
import { useReleaseNotesStore } from '@/store/releaseNotesStore';
import { WhatsNewSheet } from '@/features/release/WhatsNewSheet';

export function App() {
  const loaded = useVaultStore((s) => s.loaded);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const accountLoaded = useAccountStore((s) => s.loaded);
  const tutorialLoaded = useTutorialStore((s) => s.loaded);
  const releaseLoaded = useReleaseNotesStore((s) => s.loaded);
  const shouldShowWhatsNew = useReleaseNotesStore((s) => s.shouldShowWhatsNew);
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
      await useReleaseNotesStore.getState().load();
      await ensureOwnerUnlockSeeded();
      const migrated = await runV11OwnerRecoveryMigration();
      if (migrated) toast('Updating security for v11…', 'default');
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
    const qs = q.toString();
    navigate(qs ? `/items/new?${qs}` : '/items/new');
  };

  if (!loaded || !settingsLoaded || !accountLoaded || !tutorialLoaded || !releaseLoaded) {
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
      <WhatsNewSheet
        open={shouldShowWhatsNew}
        onContinue={() => void useReleaseNotesStore.getState().markSeen()}
      />
      <ToastHost />
    </div>
  );
}
