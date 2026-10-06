// Service Worker: PWA Offline Shell & Student Pass Asset Cache
const CACHE_NAME = 'sdt-pwa-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/chmsu-logo.png',
  '/chmsu-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal asset failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip API requests (APIs handled by client indexedDB/localStorage)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch from network in background to refresh cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});

        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Background Push Notification Handling (RFC 8291 / W3C Web Push)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Carlos Hilado Memorial State University',
    body: 'Academic status or classroom attendance alert',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'sdt-alert',
    data: { url: '/dashboard/student/portal' }
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'sdt-alert',
    renotify: true,
    data: data.data || { url: '/dashboard/student/portal' },
    vibrate: [150, 50, 150],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open Portal' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler: Focus or open window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync (RFC / W3C Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-attendance') {
    event.waitUntil(notifyClientsToDrainAttendanceQueue());
  }
});

// Periodic Background Sync API
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-attendance-sync') {
    event.waitUntil(notifyClientsToDrainAttendanceQueue());
  }
});

function notifyClientsToDrainAttendanceQueue() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'SDT_DRAIN_OFFLINE_ATTENDANCE' });
    });
  });
}


