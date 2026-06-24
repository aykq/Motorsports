# MSHub — Baştan Arayüz Tasarımı (Redesign) Planı

## Bağlam / Amaç
MSHub şu an Tailwind v4 + shadcn'in **kutudan-çıkma nötr gri teması**, **tek font (Geist)** ve ad-hoc `rose-500` vurgularla çalışıyor — ayırt edici bir kimliği yok ("templated default"). Amaç: tüm sayfa ve bileşenleri, **hem açık hem koyu tema**, **tüm kırılımlar (xs→2xl)** için, motorsporu kimliğine sahip tutarlı bir tasarım sistemiyle **baştan tasarlamak**; ardından **backend'i yeni tasarımın ihtiyaçlarına göre uyarlamak**.

**Konu (subject):** Çok-serili (F1, MotoGP, Moto2/3, WEC, GT3/GT4, Carrera Cup) motorsporu **sonuç / takvim / puan durumu / pilot-takım-pist bilgisi + haber** companion'ı. Veri cron ile periyodik senkronlanıyor; canlı hava durumu (seans sırasında polling) + geri sayım + push bildirim var. Gerçek-zamanlı timing tower **yok**.

**Süreç:** Mockup-first. Önce tasarım dili + kilit ekran mockup'ları onaylanır, sonra koda dökülür.

**Çalışma akışı:** Local (`D:\…\Motorsports`) → commit → push → CI/CD otomatik deploy. Her fazda Playwright ile mockup/ekran görüntüsü doğrulaması (admin/auth kapalı sayfalar için statik mock), sonra canlıda gözden geçirme. i18n (TR/EN) korunacak; commit mesajları İngilizce, Co-Authored-By yok.

---

## Kapsam Envanteri

**24 route** — Auth/giriş dışı: `login`, `blocked`, `pending`, `force-signout`. Ana app (Sidebar+BottomNav kabuğu):
`/` (takvim), `/series`, `/[series]` (hub), `/[series]/schedule`, `/standings`, `/drivers` + `/drivers/[id]`, `/teams` + `/teams/[id]`, `/circuits` + `/circuits/[id]`, **`/races/[round]`** (en karmaşık), `/news` + `/news/[id]`, `/favorites`, `/settings`, `/admin` (+ `admin/approve`, `admin/users`).

**~40 bileşen** — Layout: Sidebar, BottomNav, BackButton, PageTransitionWrapper, Language/ThemeToggle. Calendar: CalendarClient. Race kümesi (en yoğun): RaceCard, RaceResultsSection, WECRaceResultsSection, QualifyingSection, PracticeSection, SessionTabs, TireStints, RaceControlSection, RaceTimeline, RaceWeatherSection, WeatherChip, Countdown, CircuitHeroPhoto, CircuitLayoutImage. Series: DriverPhoto, TeamLogo. Settings: NotificationSettings. PWA: InstallPrompt. UI primitive (11): avatar, badge, button, card, input, separator, sheet, skeleton, skeletons, switch, tabs.

**Korunacak kurumsal değer:** per-series renk sistemi (8 seri rengi) — anlam taşıyan yapısal bir dil, formalize edilip token'a taşınacak. Brand kırmızısı (#e11d48) gözden geçirilecek.

---

## Fazlar

### Faz 0 — Tasarım dili + kilit ekran mockup'ları  ⛔ ONAY KAPISI
- Token sistemi: renk (açık+koyu oklch ramp + brand + 8 seri rengi), **tipografi** (tek Geist yerine: karakterli kondens display + tabular/mono sayı fontu + okunur body), spacing/radius/elevation/motion/breakpoint ölçeği. "Signature" öğesi belirlenir.
- 3-4 kilit ekran statik mockup (HTML, **açık+koyu**, **mobil+masaüstü**), Playwright ile ekran görüntüsü: (1) Takvim/ana sayfa, (2) **Race detay**, (3) Seri hub, (4) Admin.
- Kullanıcı yönü onaylar → ancak sonra kod yazılır.

### Faz 1 — Tasarım sistemini koda dök
- `globals.css` token'ları (açık+koyu) yeniden yaz; `next/font` ile yeni fontlar; tailwind `@theme` güncelle.
- UI primitive'leri yeni sisteme göre yeniden kur (button, card, badge, tabs, input, switch, sheet, avatar, separator, skeleton).
- Uygulama kabuğu: Sidebar (masaüstü) + BottomNav (mobil) + üst bar — tüm kırılımlarda responsive.

### Faz 2 — Çekirdek navigasyon + yoğun sayfalar
Takvim/ana sayfa (CalendarClient), Seri seçici, Seri hub, Favorites, Settings, Login + pending/blocked/force-signout.

### Faz 3 — Seri alt sayfaları
Schedule, Standings, Drivers + drivers/[id], Teams + teams/[id], Circuits + circuits/[id]. Bileşenler: RaceCard, DriverPhoto, TeamLogo.

### Faz 4 — Yarış hafta sonu (en karmaşık)
`races/[round]` + tüm race bileşenleri: Results/WEC/Qualifying/Practice, SessionTabs, TireStints, RaceControlSection, RaceTimeline, RaceWeatherSection, WeatherChip, Countdown, Circuit foto/layout.

### Faz 5 — Haberler + Admin + PWA
News list + detay, Admin paneli, NotificationSettings, InstallPrompt.

### Faz 6 — Backend uyarlaması (tasarım gereksinimlerine göre)
Her veri-güdümlü bileşen için backend hizalaması: sync adapter'lar / API route'lar / DB şeması, yeni tasarımın ihtiyaç duyduğu alanları (ör. pilot uyruğu/bayrak, ek görsel, sıralama alanları) sağlayacak şekilde güncellenir. [[project-gt3-carrera-datadriven]] notu da bu fazda değerlendirilir. Migration motorsports'un `scripts/migrate.cjs` (drizzle SQL) akışıyla.

### Faz 7 — Responsive QA + cila
xs→2xl tüm kırılımlar, açık+koyu tema, erişilebilirlik (focus, reduced-motion, kontrast), performans, PWA. Her faz sonunda Playwright ekran görüntüsü + canlı gözden geçirme.

---

## Kalite zemini (her fazda)
Mobile-first responsive (sm/md/lg/xl/2xl), görünür klavye focus'u, `prefers-reduced-motion` saygısı, yeterli kontrast, i18n TR/EN korunur, tema değişiminde bozulma yok.

## Doğrulama
Her fazda: build/lint temiz → Playwright ile mobil+masaüstü (+ açık/koyu) ekran görüntüsü → onay → push → CI deploy → canlı kontrol.
