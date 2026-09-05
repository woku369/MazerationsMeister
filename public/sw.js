// Service Worker fuer MazerationsMeister PWA
const CACHE_NAME = 'mazerations-meister-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.ico',
  '/images/gurktaler-logo.png',
  '/mazeration-pwa.html',
  '/mazeration-manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      STATIC_ASSETS.filter(url => !url.includes('gurktaler-logo')) // Skip missing assets
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension:')) return;

  const url = event.request.url;
  const shouldCache =
    url.includes('/_next/static/') ||
    url.endsWith('.ico') ||
    url.endsWith('.png') ||
    url.endsWith('mazeration-pwa.html') ||
    url.endsWith('mazeration-manifest.json') ||
    url.endsWith('tank-offline.html') ||
    url.endsWith('tank-viewer.html');

  if (shouldCache) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
});
