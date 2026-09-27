import type { MouseEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { Home, Layers, Plus, Search, Settings } from 'lucide-react';
import './BottomNav.css';

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const navigate = useSmoothNavigate();
  const { pathname } = useLocation();

  const goTab = (to: string) => (e: MouseEvent) => {
    if (pathname === to) {
      e.preventDefault();
      return;
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className="nav-item" onClick={goTab('/')}>
        <Home size={22} strokeWidth={1.8} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/pockets" className="nav-item" onClick={goTab('/pockets')}>
        <Layers size={22} strokeWidth={1.8} />
        <span>Pockets</span>
      </NavLink>
      <button
        type="button"
        className="nav-add"
        aria-label="Add"
        onClick={() => {
          onAdd();
          // Keep route as-is; sheet is overlayed.
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          navigate('/search');
        }}
      >
        <Plus size={26} strokeWidth={2.2} />
      </button>
      <NavLink to="/search" className="nav-item" onClick={goTab('/search')}>
        <Search size={22} strokeWidth={1.8} />
        <span>Search</span>
      </NavLink>
      <NavLink to="/settings" className="nav-item" onClick={goTab('/settings')}>
        <Settings size={22} strokeWidth={1.8} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
