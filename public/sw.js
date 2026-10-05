// Service Worker fuer MazerationsMeister PWA
const CACHE_NAME = 'mazerations-meister-v4';
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

  // Netzwerk-zuerst: Viewer-Seiten werden per QR-Code regelmaessig neu
  // aufgerufen und sollen bei bestehender Verbindung immer den aktuellen
  // Code zeigen (Nutzer-Meldung 05.10.2026: Kategorie-Anzeige blieb trotz
  // erfolgreichem Deploy und geloeschten Browserdaten alt - Ursache war die
  // alte Cache-zuerst-Strategie unten, die eine einmal gecachte Datei nie
  // wieder durch eine neuere vom Server ersetzt hat). Cache dient hier nur
  // als Fallback, wenn wirklich kein Netz da ist.
  const shouldNetworkFirst =
    url.endsWith('tank-viewer.html') ||
    url.endsWith('tank-offline.html');

  if (shouldNetworkFirst) {
    event.respondWith(
      fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-zuerst: eigentliches App-Shell/Offline-Formular (mazeration-pwa.html)
  // und wirklich statische Assets - hier ist garantierte Offline-Verfuegbarkeit
  // wichtiger als sofortige Aktualitaet, und Aenderungen daran kommen ohnehin
  // nur zusammen mit einem CACHE_NAME-Bump.
  const shouldCacheFirst =
    url.includes('/_next/static/') ||
    url.endsWith('.ico') ||
    url.endsWith('.png') ||
    url.endsWith('mazeration-pwa.html') ||
    url.endsWith('mazeration-manifest.json');

  if (shouldCacheFirst) {
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
