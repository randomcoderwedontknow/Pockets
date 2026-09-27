import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PocketDetail } from '@/features/pockets/PocketDetail';
import { PocketEditor } from '@/features/pockets/PocketEditor';
import { ItemDetail } from '@/features/items/ItemDetail';
import { ItemEditor } from '@/features/items/ItemEditor';
import { AccountSettings } from '@/features/settings/AccountSettings';
import { TutorialScreen } from '@/features/tutorial/TutorialScreen';
import { AppearanceSettings } from '@/features/settings/AppearanceSettings';
import { SecuritySettings } from '@/features/settings/SecuritySettings';
import { DataSettings } from '@/features/settings/DataSettings';
import { PocketsManage } from '@/features/settings/PocketsManage';
import { AboutSettings } from '@/features/settings/AboutSettings';

export function StackRoutes({ openAdd, exiting }: { openAdd: (pocketId?: string) => void; exiting?: boolean }) {
  const location = useLocation();
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layerRef.current) layerRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className={['stack-layer', exiting && 'stack-layer--exit'].filter(Boolean).join(' ')} ref={layerRef}>
      <div className="stack-content">
        <Routes location={location}>
          <Route path="/pockets/new" element={<PocketEditor />} />
          <Route path="/pockets/:id/edit" element={<PocketEditor />} />
          <Route path="/pockets/:id" element={<PocketDetail onAdd={(pid) => openAdd(pid)} />} />
          <Route path="/items/new" element={<ItemEditor />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/items/:id/edit" element={<ItemEditor />} />
          <Route path="/settings/account" element={<AccountSettings />} />
          <Route path="/settings/tutorial" element={<TutorialScreen />} />
          <Route path="/settings/appearance" element={<AppearanceSettings />} />
          <Route path="/settings/security" element={<SecuritySettings />} />
          <Route path="/settings/data" element={<DataSettings />} />
          <Route path="/settings/pockets" element={<PocketsManage />} />
          <Route path="/settings/about" element={<AboutSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
