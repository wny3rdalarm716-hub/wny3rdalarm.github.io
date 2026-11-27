/* Cache only app-owned static assets; never store incident or weather data. */
importScripts('./notification-history.js?v=2.8');
const APP_VERSION = '2.8';
const CACHE = 'wny-app-static-v2.8';
const STATIC_FILES = [
  './offline.html', './photography.css?v=2.8', './experience.css?v=2.8', './experience.js?v=2.8', './app.css?v=2.4', './app.js?v=2.8',
  './push.js?v=2.8', './connectivity.css?v=2.8', './connectivity.js?v=2.8', './notification-history.js?v=2.8', './manifest.webmanifest', './icons/icon-192.png',
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
  // Staff pages and configuration are network-only, not cached by this worker.
  if (url.pathname.startsWith(new URL('./admin/', scope).pathname) || url.pathname === new URL('./admin-config.js', scope).pathname || url.pathname === new URL('./public-admin.js', scope).pathname) return;
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

// Accept authorized FCM console notification messages and data-only tests.
// Display fixed test text rather than arbitrary payload content.
self.addEventListener('push', event => {
  let payload;
  try { payload = event.data.json(); } catch (_) { return; }
  if (!payload?.notification && payload?.data?.kind !== 'test') return;
  event.waitUntil(self.registration.showNotification('WNY 3RD ALARM', {
    body: 'Test notification received.', icon: new URL('./icons/icon-192.png', scope).href, tag: 'wny-test'
  }).then(() => self.wnyNotificationHistory.record('remote').catch(() => {})));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(self.registration.scope));
});
