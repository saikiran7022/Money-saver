/*
 * Money Saver service worker — offline app shell, same-origin only.
 *
 * Privacy note: this worker NEVER fetches, caches, or proxies a cross-origin
 * request. It only ever touches assets from the app's own origin, which keeps
 * the project's zero-egress guarantee intact even when installed as a PWA.
 *
 * Strategy:
 *   - navigations  → network-first, fall back to the cached app shell offline.
 *   - static files → cache-first (Vite content-hashes them, so they're immutable).
 * Bump CACHE_VERSION to force clients onto a fresh cache after a deploy.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `money-saver-${CACHE_VERSION}`;

// Resolve against the worker's scope so it works under any base path
// (e.g. GitHub Pages project subpaths like /Money-saver/).
const scope = self.registration.scope;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
].map((p) => new URL(p, scope).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Don't let one missing optional asset abort the whole precache.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin only — never reach across origins.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network-first so a new deploy is picked up when online; cached shell offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match(new URL('./index.html', scope).toString())),
        ),
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
