// Custom service worker additions, merged into the workbox-generated sw.js
// by next-pwa's customWorkerSrc option (see next.config.ts).
//
// PRD v1.6 / Design Specs v1.4: Flightwatch no longer implements a notification
// system of any kind (OQ-8). The SHOW_NOTIFICATION postMessage handler has been
// removed. Alert conditions are communicated solely through the in-app UI
// (amber card state, pulse animation) and an aria-live announcement.
//
// The service worker's only responsibilities are:
//   • Workbox cache strategies (injected by next-pwa)
//   • SKIP_WAITING for immediate activation on update
//   • notificationclick stub (handles any stale notifications from
//     devices upgraded from a pre-v1.6 build — closes them gracefully)

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Graceful fallback: if a device upgraded from pre-v1.6 receives a stale
// notification click (e.g. from a cached pre-v1.6 service worker), open the
// app rather than doing nothing.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
