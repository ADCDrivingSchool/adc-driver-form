// D.R.I.V.E.R. Evaluation Form — Service Worker
// Caches the app for offline use, enables PWA installation,
// and handles incoming shared files (Web Share Target API).

const CACHE      = 'driver-eval-v2';
const SHARE_KEY  = 'driver-pending-share';
const PRECACHE   = ['./index.html', './manifest.json'];

// Install: cache core files
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: intercept Share Target POST, otherwise serve from cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Web Share Target: Android shares a file to this app
  if (e.request.method === 'POST' && url.searchParams.has('share-target')) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('file');
        if (file) {
          const text = await file.text();
          // Store in a dedicated share cache so the client can pick it up
          const shareCache = await caches.open(SHARE_KEY);
          await shareCache.put('/pending', new Response(text, {
            headers: { 'Content-Type': 'text/plain' }
          }));
        }
      } catch (_) {}
      // Redirect to the app — the page will read the pending share on load
      return Response.redirect('./index.html', 303);
    })());
    return;
  }

  // Normal fetch: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
