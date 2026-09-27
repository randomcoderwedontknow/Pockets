import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HomeScreen } from '@/features/home/HomeScreen';
import { PocketsScreen } from '@/features/pockets/PocketsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { isPrimaryTabPath, primaryTabForPath } from './appRoutes';
import { StackRoutes } from './StackRoutes';
import type { PrimaryTab } from './appRoutes';

const STACK_EXIT_MS = 170;

function tabClass(active: PrimaryTab, tab: PrimaryTab): string {
  return ['tab-panel', active === tab && 'tab-panel--active'].filter(Boolean).join(' ');
}

export function AppShell({ openAdd }: { openAdd: (pocketId?: string) => void }) {
  const { pathname } = useLocation();
  const activeTab = primaryTabForPath(pathname);
  const onPrimary = isPrimaryTabPath(pathname);
  const [stackMounted, setStackMounted] = useState(!onPrimary);
  const [stackExiting, setStackExiting] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<PrimaryTab>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  useEffect(() => {
    if (!onPrimary) {
      setStackExiting(false);
      setStackMounted(true);
      return;
    }
    if (!stackMounted) return;
    setStackExiting(true);
    const id = window.setTimeout(() => {
      setStackMounted(false);
      setStackExiting(false);
    }, STACK_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [onPrimary, stackMounted]);

  return (
    <div className="app-shell">
      <div className="tab-panels" data-active={activeTab}>
        {visitedTabs.has('home') && (
          <section className={tabClass(activeTab, 'home')} aria-hidden={activeTab !== 'home'} inert={activeTab !== 'home'}>
            <HomeScreen onAdd={() => openAdd()} />
          </section>
        )}
        {visitedTabs.has('pockets') && (
          <section className={tabClass(activeTab, 'pockets')} aria-hidden={activeTab !== 'pockets'} inert={activeTab !== 'pockets'}>
            <PocketsScreen />
          </section>
        )}
        {visitedTabs.has('search') && (
          <section className={tabClass(activeTab, 'search')} aria-hidden={activeTab !== 'search'} inert={activeTab !== 'search'}>
            <SearchScreen />
          </section>
        )}
        {visitedTabs.has('settings') && (
          <section className={tabClass(activeTab, 'settings')} aria-hidden={activeTab !== 'settings'} inert={activeTab !== 'settings'}>
            <SettingsScreen />
          </section>
        )}
      </div>
      {stackMounted && <StackRoutes openAdd={openAdd} exiting={stackExiting} />}
    </div>
  );
}
