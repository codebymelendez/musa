// Musa Service Worker — push notifications con action buttons

self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Musa', body: 'Tienes una nueva notificación' };

  const actions = data.actions || [];

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    tag: data.tag || 'musa-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      appointmentId: data.appointmentId,
      action: data.action,
    },
    actions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const appointmentId = notifData.appointmentId;
  const clickedAction = event.action; // 'confirm' | 'cancel' | '' (body click)

  // Si el usuario pulsó un botón de acción (confirmar/cancelar cita)
  if (appointmentId && (clickedAction === 'confirm' || clickedAction === 'cancel')) {
    const apiUrl = `/api/appointments/${appointmentId}/action?action=${clickedAction}`;
    event.waitUntil(
      fetch(apiUrl, { method: 'POST', credentials: 'include' }).then(() => {
        // Abrir la app solo si está cerrada
        return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          const appUrl = clickedAction === 'confirm' ? '/home' : '/home';
          const existing = windowClients.find((c) => c.url.includes(self.location.origin));
          if (existing) return existing.focus();
          return clients.openWindow(appUrl);
        });
      }).catch(() => {})
    );
    return;
  }

  // Click en el cuerpo → abrir la URL indicada
  const urlToOpen = notifData.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(urlToOpen);
        return existing.focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
