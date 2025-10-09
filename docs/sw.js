// Service Worker für MazerationsMeister PWA - Vereinfachte Version
const CACHE_NAME = 'mazerations-meister-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.ico',
  '/images/gurktaler-logo.png'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  self.skipWaiting();
});

// Aktivierung
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Aktivierung');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Vereinfachter Fetch-Handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests und Extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension:')) {
    return;
  }

  // Nur für statische Assets cachen
  if (event.request.url.includes('/_next/static/') || 
      event.request.url.endsWith('.ico') ||
      event.request.url.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
  }
});

console.log('� Service Worker: Geladen (Vereinfacht)');
