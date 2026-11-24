/* Only app-owned, static files are stored. Incident, weather, analytics and
   third-party requests are never intercepted or written to Cache Storage. */
const CACHE = 'wny-app-static-v1';
const STATIC_FILES = ['./offline.html', './app.css', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC_FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('wny-app-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(() => caches.match('./offline.html')));
    return;
  }
  // Serve only the exact, explicitly pre-cached app assets; do not cache runtime responses.
  if (STATIC_FILES.some(path => new URL(path, self.registration.scope).href === url.href)) {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
  }
});
