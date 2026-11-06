/**
 * HD2Lab Todo Master - Service Worker
 * Provides offline caching for static assets.
 */

const CACHE_PREFIX = 'hd2lab-todo-';
const CACHE_NAME = 'hd2lab-todo-v2.2.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './favicon.svg',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './js/state/store.js',
  './js/models/todo.js',
  './js/services/storage.js',
  './js/services/backup.js',
  './js/utils/date.js',
  './js/utils/calendar-date.js',
  './js/utils/security.js',
  './js/utils/parser.js',
  './js/ui/components.js',
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/ui/dnd.js',
  './js/ui/pagination.js',
  './js/ui/calendar.js',
  './js/ui/sidebar.js',
  './js/ui/workspace.js',
  './js/ui/mobile-nav.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Never delete caches belonging to other applications sharing the same origin!
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Offline - ignore network error since we have cached response
          });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
