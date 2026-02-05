import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Using simple relative path to avoid URL constructor errors in sandboxed environments
    const swPath = './sw.js';
    
    navigator.serviceWorker.register(swPath)
      .then(reg => console.log('Ginza PWA: Service Worker active', reg.scope))
      .catch(err => {
        if (
          window.location.hostname.includes('usercontent.goog') || 
          (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost')
        ) {
          console.log('Ginza PWA: Service Worker skipped (Preview or Insecure Mode)');
        } else {
          console.error('Ginza PWA: Registration failed', err);
        }
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);