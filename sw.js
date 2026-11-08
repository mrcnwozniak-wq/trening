// Pozwala działać bez internetu. Przy każdej zmianie aplikacji podbij numer wersji.
const VERSION = 'trening-v1';
const FILES = [
  './', './index.html', './styles.css', './plan.js', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  "./img/d1a1.png",
  "./img/d1a2.png",
  "./img/d1b1.png",
  "./img/d1b2.png",
  "./img/d1c1.png",
  "./img/d1c2.png",
  "./img/d1d1.png",
  "./img/d1d2.png",
  "./img/d1e.png",
  "./img/d1e_alt.png",
  "./img/d2a1.png",
  "./img/d2a2.png",
  "./img/d2b1.png",
  "./img/d2b2.png",
  "./img/d2c.png",
  "./img/d2d1.png",
  "./img/d2d2.png",
  "./img/d2e.png",
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
