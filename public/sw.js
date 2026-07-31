const CACHE_NAME = "motorsports-hub-v2";
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

  // Cross-origin istekleri (CDN görseller vb.) — SW'ya bırakma, tarayıcı doğrudan yönetsin
  if (!request.url.startsWith(self.location.origin)) return;

  // Next.js dahili istekler — image optimizer, static chunk'lar
  if (request.url.includes("/_next/")) return;

  // Next.js RSC (React Server Component) navigasyon istekleri — tam sayfa
  // HTML'i değil, kısmi render payload'ını taşır. Bunları normal sayfa
  // navigasyonuyla aynı URL altında cache'lersek, geri gitme/bfcache-miss
  // sonrası tam sayfa yüklemesi bozuk (RSC payload) içerik alabilir ve
  // uygulama beklenmedik şekilde ana sayfaya düşebilir. SW'ya bırakma.
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
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(async () => {
        // Bu URL daha önce başarıyla ziyaret edilip cache'lenmişse onu göster.
        const cached = await caches.match(request);
        if (cached) return cached;
        // Hiç cache'lenmemiş bir sayfaya (örn. mobilde arka-ileri sonrası
        // bfcache kaçırılıp tam sayfa yenilemesi tetiklenmişse) geçici bir ağ
        // sorunuyla ulaşılamadıysa, sessizce ana sayfaya ("/") düşme — kullanıcı
        // nereden geldiğini kaybeder. Tarayıcının kendi "bağlantı yok" hata
        // sayfasını göstermesine izin ver (yeniden dene butonuyla).
        throw new Error("network-and-cache-miss");
      })
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
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Zaten açık bir pencere varsa (hangi sayfada olursa olsun) onu bildirimin
      // hedef URL'ine yönlendirip öne getir — sadece URL birebir eşleşiyorsa
      // odaklanmak, uygulama farklı bir sayfada açıkken tıklamayı etkisiz kılıyordu.
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
