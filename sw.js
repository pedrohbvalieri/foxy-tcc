// Foxy Service Worker — v1.0
const CACHE = 'foxy-v1';
const PRECACHE = [
  '/', '/index.html', '/login.html', '/register.html',
  '/dashboard.html', '/games.html', '/profile.html',
  '/achievements.html', '/settings.html', '/safety.html',
  '/waiting.html', '/draw-game.html', '/story-game.html',
  '/quiz-game.html', '/puzzle-game.html', '/emoji-game.html',
  '/styles.css', '/styles-auth.css', '/app.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Quicksand:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE.filter(u => !u.startsWith('http'))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore') || e.request.url.includes('firebase')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchAndCache = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
