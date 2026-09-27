import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SmoothNavigationProvider } from '@/layout/SmoothNavigationProvider';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyInitialTheme } from './store/settingsStore';
import './styles/global.css';

applyInitialTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SmoothNavigationProvider>
          <App />
        </SmoothNavigationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
