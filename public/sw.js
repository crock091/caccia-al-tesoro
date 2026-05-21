// Service Worker — Caccia al Tesoro
// Gestisce push notifications e badge

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

// ── Push handler ─────────────────────────────────────────────────
self.addEventListener('push', function (event) {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) {}

  const title = data.title || 'Caccia al Tesoro'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || ('cat-' + Date.now()),
    data: { url: data.url || '/admin' },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      try {
        if ('setAppBadge' in navigator) navigator.setAppBadge()
      } catch (e) {}
    })
  )
})

// ── Click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/admin'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Message handler (badge clear) ───────────────────────────────
self.addEventListener('message', function (event) {
  if (event.data?.type === 'CLEAR_BADGE') {
    try {
      if ('clearAppBadge' in navigator) navigator.clearAppBadge()
    } catch (e) {}
  }
})
