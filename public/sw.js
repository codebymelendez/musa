self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Musa', body: 'Tienes una nueva notificación' };
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png', // URL de tu icono
    badge: '/icons/badge.png', // URL de tu peque-icono
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
