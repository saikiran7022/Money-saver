// Registers the service worker that powers offline / installable PWA support.
// Only runs in production builds — during `vite dev` a SW would aggressively
// cache and fight hot-module reloading. The worker itself is same-origin only,
// preserving the app's zero-egress privacy guarantee.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // BASE_URL respects Vite's `base` (e.g. '/Money-saver/' on GitHub Pages),
    // so the worker is registered at the correct path with the correct scope.
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      // Non-fatal: the app works fine without offline support.
      console.warn('Service worker registration failed:', err);
    });
  });
}
