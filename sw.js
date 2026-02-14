const CACHE_VERSION = 'v' + '20260117-3'; // Format: AnnéeMoisJour-VersionDuJour
const CACHE_NAME = `prepacode-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './assets/img/Logo_02.webp',
  './assets/img/Logo_02.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Installation : Mise en cache initiale
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Force le nouveau SW à prendre le contrôle immédiatement
});

// 2. Activation : Nettoyage des anciens caches [NOUVEAU]
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Récupère le contrôle des pages ouvertes immédiatement
});

// 3. Stratégie de Fetch (Stale-while-revalidate modifiée)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});