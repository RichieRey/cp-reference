const CACHE = 'safeid-cp-v16';
const ASSETS = [
  '/cp-reference/',
  '/cp-reference/index.html',
  '/cp-reference/curso.html',
  '/cp-reference/manifest.json',
  '/cp-reference/icons/icon-192.png',
  '/cp-reference/icons/icon-512.png',
  '/cp-reference/icons/icon-192-maskable.png',
  '/cp-reference/icons/icon-512-maskable.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
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
  var url = e.request.url;
  if (url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    return;
  }

  var isHTML = e.request.mode === 'navigate' ||
               url.endsWith('.html') ||
               url.endsWith('/cp-reference/');

  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/cp-reference/index.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('/cp-reference/index.html');
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'GET_VERSION') {
    if (e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
  }
});
