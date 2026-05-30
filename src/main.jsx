import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.info('[SW] Registered:', registration.scope);

      // When a new SW version is waiting, activate it immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed — send skip-waiting and reload
            console.info('[SW] New version found, activating...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // When SW controller changes (new SW activated), reload the page to get fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.info('[SW] Controller changed — reloading for fresh assets');
          window.location.reload();
        }
      });

    } catch (error) {
      console.warn('[SW] Registration failed:', error);
    }
  });
}
