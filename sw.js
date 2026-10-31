// Bump this version whenever the public app shell changes.
const PREFIX = 'hongbi-public-';
const CACHE = `${PREFIX}20261031-v2`;
const BASE = new URL('./', self.location.href);
const ASSETS = ['index.html', 'config.js', 'mobile.js', 'mobile-core.js', 'mobile.css',
  'manifest.webmanifest', 'assets/xiaomo-panda.png', 'assets/app-icon-192.png',
  'assets/app-icon-512.png', 'assets/hongbi-qr.png'];
const PUBLIC_URLS = new Set(ASSETS.map(path => new URL(path, BASE).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    ASSETS.map(path => new Request(new URL(path, BASE), { cache: 'reload' }))
  )));
  // Do not skipWaiting/reload an open editor: unsent writing lives in memory.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept teacher pages, private records, POSTs or provider requests.
  if (request.method !== 'GET' || url.origin !== BASE.origin) return;
  const appNavigation = request.mode === 'navigate' &&
    (url.pathname === BASE.pathname || url.pathname === new URL('index.html', BASE).pathname);
  const key = appNavigation ? new URL('index.html', BASE).href : url.href;
  if (!PUBLIC_URLS.has(key)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(key, response.clone());
        } catch { /* A full/disabled cache must not break the online response. */ }
      }
      return response;
    } catch {
      const cached = await caches.match(key, { cacheName: CACHE });
      return cached || Response.error();
    }
  })());
});
