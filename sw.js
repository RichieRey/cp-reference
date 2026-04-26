const CACHE = 'safeid-cp-v1';
const ASSETS = [
  '/cp-reference/',
  '/cp-reference/index.html',
  '/cp-reference/manifest.json',
  '/cp-reference/icons/icon-192.png',
  '/cp-reference/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap',
  'https://accounts.google.com/gsi/client'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cache core assets, ignore failures for external resources
      return Promise.allSettled(
        ASSETS.map(function(url) {
          return cache.add(url).catch(function() {});
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Don't intercept Google Drive API calls
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com/gsi')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache successful GET requests
        if (e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        return caches.match('/cp-reference/index.html');
      });
    })
  );
});
