// Money Nitro Service Worker — v4 (Network-First, Supabase bypass)
const CACHE_VERSION = 'money-nitro-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Assets that are truly static and can be cached long-term
const STATIC_ASSETS = [
  '/icon.png',
  '/manifest.webmanifest',
];

// Domains to NEVER intercept (Supabase API, Realtime WebSocket, etc.)
const BYPASS_DOMAINS = [
  'supabase.co',
  'supabase.com',
  'xiaomimimo.com',
  'token-plan-sgp',
];

const shouldBypass = (url) => {
  return BYPASS_DOMAINS.some(domain => url.includes(domain));
};

const isStaticAsset = (url) => {
  return STATIC_ASSETS.some(asset => url.endsWith(asset));
};

// Install: cache only truly static files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove ALL old caches immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1. Skip non-GET requests entirely
  if (e.request.method !== 'GET') return;

  // 2. Skip Supabase and API calls — let browser handle directly
  if (shouldBypass(url)) return;

  // 3. Skip chrome-extension and non-http(s) requests
  if (!url.startsWith('http')) return;

  // 4. Static assets (icon, manifest) — Cache-First
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => cache.put(e.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. Everything else (HTML, JS bundles, CSS) — Network-First
  // Always get fresh code from server; fall back to cache only when truly offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses for offline fallback
        if (response.ok && response.status === 200) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(e.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache, fall back to index.html for SPA routing
        return caches.match(e.request)
          .then(cached => cached || caches.match('/'));
      })
  );
});

// Listen for skip-waiting message from client
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
