import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { handleInAppAnchorClick, smoothNavigate } from './smoothNavigation';

type SmoothNavigate = (to: To | number, options?: NavigateOptions) => void;

const SmoothNavContext = createContext<SmoothNavigate | null>(null);

export function SmoothNavigationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const go = useCallback<SmoothNavigate>((to, options) => {
    smoothNavigate(navigate, to, options);
  }, [navigate]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      handleInAppAnchorClick(e, navigate);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return <SmoothNavContext.Provider value={go}>{children}</SmoothNavContext.Provider>;
}

export function useSmoothNavigate(): SmoothNavigate {
  const ctx = useContext(SmoothNavContext);
  const navigate = useNavigate();
  return ctx ?? ((to, options) => smoothNavigate(navigate, to, options));
}
