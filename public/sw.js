const CACHE_NAME = "motorsports-hub-v3";

// Cap how long the offline fallback may serve a cached page, so a race-weekend
// snapshot can't linger for hours on a flaky connection.
const NAV_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const CACHED_AT_HEADER = "x-sw-cached-at";
const PRECACHE_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.url.includes("/api/")) return;

  // Cross-origin istekleri (CDN görseller vb.) — SW'ya bırakma, tarayıcı doğrudan yönetsin
  if (!request.url.startsWith(self.location.origin)) return;

  // Next.js dahili istekler — image optimizer, static chunk'lar
  if (request.url.includes("/_next/")) return;

  // RSC navigasyon istekleri gerçek HTML değil kısmi payload taşır — sayfa
  // URL'i altında cache'lenirse geri-navigasyonda bozuk içerik gösterebilir.
  if (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-State-Tree") ||
    request.headers.get("Next-Router-Prefetch")
  ) {
    return;
  }

  // Sadece tam sayfa navigasyonlarını (adres çubuğu/geri-ileri/link tıklama)
  // cache'le — diğer fetch/XHR istekleri (veri, prefetch vb.) SW dışında kalsın.
  if (request.mode !== "navigate" && request.destination !== "document") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          // Re-store with a timestamp header so the offline fallback can age it out.
          response
            .clone()
            .blob()
            .then((body) => {
              const headers = new Headers(response.headers);
              headers.set(CACHED_AT_HEADER, String(Date.now()));
              return caches.open(CACHE_NAME).then((cache) =>
                cache.put(
                  request,
                  new Response(body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers,
                  })
                )
              );
            })
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER)) || 0;
          if (Date.now() - cachedAt < NAV_CACHE_MAX_AGE_MS) return cached;
          caches.open(CACHE_NAME).then((cache) => cache.delete(request)).catch(() => {});
        }
        // Let the browser show its own offline page rather than a stale/other route.
        throw new Error("network-and-cache-miss");
      })
  );
});

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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Açık pencere varsa (hangi sayfada olursa olsun) hedef URL'e yönlendirip öne getir.
      const existing = windowClients.find((c) => "focus" in c);
      if (existing) {
        return ("navigate" in existing ? existing.navigate(url) : Promise.resolve(existing)).then((client) =>
          (client ?? existing).focus()
        );
      }
      return clients.openWindow(url);
    })
  );
});
