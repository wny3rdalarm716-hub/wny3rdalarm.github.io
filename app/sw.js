/* Cache only app-owned static assets; never store incident or weather data. */
const APP_VERSION = '2.2';
const CACHE = 'wny-app-static-v2.2';
const STATIC_FILES = [
  './offline.html', './app.css?v=2.2', './app.js?v=2.2',
  './manifest.webmanifest', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-180.png'
];
const scope = self.registration.scope;
const staticURLs = new Set(STATIC_FILES.map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  // Bypass the HTTP cache so an update cannot populate its cache with old files.
  const requests = STATIC_FILES.map(path => new Request(new URL(path, scope), {cache: 'reload'}));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('wny-app-static-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.pathname.startsWith(new URL(scope).pathname)) {
    event.respondWith(fetch(request, {cache: 'no-store'}).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(new URL('./offline.html', scope))) || Response.error();
    }));
  } else if (staticURLs.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(response => response || fetch(request)));
  }
});

self.addEventListener('message', event => {
  if (event.data === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage(APP_VERSION);
});
