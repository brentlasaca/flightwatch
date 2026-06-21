// Custom service worker additions, merged into the workbox-generated sw.js
// by next-pwa's customWorkerSrc option (see next.config.ts).
//
// Flightwatch has no backend server, so there is intentionally no `push`
// event listener here. Notifications are only ever shown via
// `self.registration.showNotification()` in direct response to a
// `postMessage` from the open app, right after a foreground fetch
// completes (PRD v1.5 §6.3). This file must never grow a `push` listener.

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: event.data.tag || 'flightwatch',
      data: event.data.url ? { url: event.data.url } : undefined,
    });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
