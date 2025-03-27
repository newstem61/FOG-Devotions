import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Initialize dark mode based on user preference
const darkMode = localStorage.getItem('darkMode');
if (darkMode === 'true' || (!darkMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Initialize font size
const fontSize = localStorage.getItem('fontSize');
if (fontSize) {
  document.documentElement.style.fontSize = `${fontSize}px`;
}

// Check if running in StackBlitz
const isStackBlitz = typeof window !== 'undefined' && 
  (window.name === 'stackblitz' || window.location.hostname.includes('stackblitz'));

// Only register service worker when not in StackBlitz
if (!isStackBlitz) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('New content available. Reload?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
    onRegistered(swRegistration) {
      if (swRegistration) {
        setInterval(async () => {
          try {
            await swRegistration.update();
          } catch (err) {
            console.error('SW update check failed:', err);
          }
        }, 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error) {
      console.warn('SW registration skipped:', error);
    }
  });
} else {
  console.log('Service worker registration skipped in StackBlitz environment');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);