// Musa Service Worker — caching + push notifications

const CACHE_NAME = 'musa-static-v1';
const PRECACHE = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API routes, Next.js internals, and auth callbacks
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/auth/')
  ) return;

  // Cache-first for static assets
  if (/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf|otf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});

// ─── Push ─────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Musa', body: 'Tienes una nueva notificación' };

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'musa-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      appointmentId: data.appointmentId,
      action: data.action,
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const appointmentId = notifData.appointmentId;
  const clickedAction = event.action;

  if (appointmentId && (clickedAction === 'confirm' || clickedAction === 'cancel')) {
    event.waitUntil(
      fetch(`/api/appointments/${appointmentId}/action?action=${clickedAction}`, {
        method: 'POST',
        credentials: 'include',
      })
        .then(() =>
          clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            const existing = wins.find((c) => c.url.includes(self.location.origin));
            if (existing) return existing.focus();
            return clients.openWindow('/home');
          })
        )
        .catch(() => {})
    );
    return;
  }

  const urlToOpen = notifData.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(urlToOpen);
        return existing.focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
