// public/service-worker.js
// service-worker.js v2
const CACHE_NAME = 'static-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil((async () => {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
  })());
});

// Network-first for Netlify functions (API)
self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/.netlify/functions/')) {
      event.respondWith(
        fetch(event.request).then((response) => response).catch(() => caches.match(event.request))
      );
      return;
    }

    // Default: cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => response).catch(() => cached);
      })
    );
  } catch (err) {
    event.respondWith(fetch(event.request));
  }
});
