const CACHE = 'training-hub-v2';

// Shell assets to cache on install so the app loads offline
const PRECACHE = [
  '/',
  '/runs',
  '/todo',
  '/progress',
  '/stats',
  '/calendar',
  '/manifest.json',
  '/IconKitchen-Output/web/icon-192.png',
  '/IconKitchen-Output/web/icon-512.png',
  '/IconKitchen-Output/web/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for API/Supabase, cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin API calls, and Supabase
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase') || url.hostname.includes('strava')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Static assets — cache first
  if (
    url.pathname.match(/\.(png|ico|jpg|jpeg|svg|webp|woff2?|css|js)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Pages — network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Training Hub', {
      body:     data.body ?? '',
      icon:     '/IconKitchen-Output/web/icon-192.png',
      badge:    '/IconKitchen-Output/web/icon-192.png',
      tag:      data.tag ?? 'training-hub',
      renotify: true,
      data:     { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
