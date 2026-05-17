const CACHE_NAME = "motorsports-hub-v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

// Kurulum: statik varlıkları cache'le
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // API isteklerini cache'leme
  if (request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push bildirim al
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const { title = "Motorsports Hub", body = "", url = "/" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

// Bildirime tıklama
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url === url && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
