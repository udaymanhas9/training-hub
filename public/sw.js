self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? '📸 Time to BeReal!', {
      body:      data.body ?? "What are you up to right now?",
      icon:      '/logo.png',
      badge:     '/logo.png',
      tag:       'bereal-daily',
      renotify:  true,
      data:      { url: '/bereal' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/bereal';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
