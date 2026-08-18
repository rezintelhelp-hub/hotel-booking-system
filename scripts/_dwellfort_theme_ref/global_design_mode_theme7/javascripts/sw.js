'use strict';

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
self.addEventListener('push', function(event) {

  const data = event.data?.json() ?? {};
  const title = data.title;
  const options = {
    body: data.message,
    data: { url: data.link },
    icon: 'images/icon.png',
    badge: 'images/badge.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
