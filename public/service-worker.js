const CACHE_NAME = 'static-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first for Netlify functions (API)
self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/.netlify/functions/')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    // Default: cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Optionally cache new static assets here:
          // const clone = response.clone();
          // caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        }).catch(() => cached);
      })
    );
  } catch (err) {
    // If anything goes wrong, fallback to network
    event.respondWith(fetch(event.request));
  }
});
