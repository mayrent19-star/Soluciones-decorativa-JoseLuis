const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `soluciones-jl-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `soluciones-jl-runtime-${CACHE_VERSION}`;
const APP_SHELL     = ['/', '/index.html', '/manifest.webmanifest'];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── HELPERS ──────────────────────────────────────────────────
const isSupabase   = (url) => url.hostname.includes('supabase.co');
const isNavigation = (req) => req.mode === 'navigate';
const isStatic     = (url) =>
  url.pathname.startsWith('/assets/') ||
  /\.(?:js|mjs|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/i.test(url.pathname);

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase — siempre red, nunca cache
  if (isSupabase(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navegación (rutas React) — red primero, fallback a index.html
  if (isNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const shell = await caches.match('/index.html');
          return shell || Response.error();
        })
    );
    return;
  }

  // Archivos estáticos — cache primero, red como fallback
  if (isStatic(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Todo lo demás — red con fallback a cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((c) => c || Response.error()))
  );
});

// ── MENSAJES ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Soluciones JL', body: 'Nueva notificación' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data:  { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      const url = event.notification.data?.url || '/';
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
