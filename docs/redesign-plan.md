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

### Faz 0 — Tasarım dili + kilit ekran mockup'ları  ✅ ONAYLANDI (2026-07-30)
- Token sistemi: renk (açık+koyu oklch ramp + brand + 8 seri rengi), **tipografi** (tek Geist yerine: karakterli kondens display + tabular/mono sayı fontu + okunur body), spacing/radius/elevation/motion/breakpoint ölçeği. "Signature" öğesi belirlenir.
- 3-4 kilit ekran statik mockup (HTML, **açık+koyu**, **mobil+masaüstü**), Playwright ile ekran görüntüsü: (1) Takvim/ana sayfa, (2) **Race detay**, (3) Seri hub, (4) Admin.
- Kullanıcı yönü onaylar → ancak sonra kod yazılır.

**Onaylanan kararlar (superpowers brainstorming, visual-companion mockup karşılaştırmasıyla):**

1. **Genel karakter — "Kontrollü teknik" (B yönü).** Koyu zemin, ince telemetri-grid çizgileri, mono veri (IBM Plex Mono ruhu), tek seri rengi ölçülü vurgu. Editoryal/dergi ve koyu-cesur/marka-öncelikli yönler değerlendirildi, elenmedi ama B seçildi — mevcut yönün olgunlaşmış hali, dashboard'a kaçmıyor.
2. **Signature öğe — pist hattı vektörü. ❌ DENENDİ, UI'DAN KALDIRILDI (2026-07-30).** Fikir: her pistin gerçek layout'undan (F1 resmi CDN haritalarından) türetilen ince çizgi, seri renginde, race hero + takvim kartlarında watermark. Extraction pipeline (`scripts/extract-track-outlines.mjs`, 24/24 F1 pisti) ve `TrackOutline` bileşeni kodda **duruyor ama kullanılmıyor** — kullanıcı çıkarılan siluetleri beğenmedi ("çok iğrenç gözüküyor"). `SeriesGlowSurface`'daki `circuitId` entegrasyonu geri alındı. İleride farklı bir yaklaşımla (ör. elle çizilmiş sade pist ikonları) tekrar denenebilir; mevcut otomatik-extraction yöntemi tekrar önerilmemeli.
3. **Büyük başlıklar — Title Case, section etiketleri küçük harf.** Sayfa/hero başlığı (ör. "Dutch Grand Prix") Title Case; section etiketleri (Race Results, Tire Stints, Weather) küçük harf + ince mono kalıyor, `text-transform:uppercase` kaldırılıyor. Manrope'un title-case mockup'ıyla tutarlı, "hacker/dashboard" hissini azaltıyor. (Bkz. [[project-mshub-redesign-font]])
4. **Seri rengi — ambient glow formülü.** Her seri sayfasında (hub) üstte ince renkli şerit + köşede soluk radial glow + standings'te aktif satır o serinin renginde vurgu. Tek formül, 8 seri için sadece renk token'ı değişir (`--f1`, `--wec` vb. zaten mevcut). Takvim kartlarında da aynı mantık: gradient arka plan + kenarlık + pist hattı watermark, seri rengiyle.
5. **Admin paneli — nötr/işlevsel, seri rengi/glow yok.** Admin marka kimliğinden çok netlik gerektiren bir alan; stat kartları + onay listesi + semantik renkler (sarı=pending, yeşil=approve, kırmızı=reject) yeterli. Diğer ekranlarla aynı tipografi/spacing/radius token'ları paylaşılır.

### Faz 1 — Tasarım sistemini koda dök
- `globals.css` token'ları (açık+koyu) yeniden yaz; `next/font` ile yeni fontlar; tailwind `@theme` güncelle.
- UI primitive'leri yeni sisteme göre yeniden kur (button, card, badge, tabs, input, switch, sheet, avatar, separator, skeleton).
- Uygulama kabuğu: Sidebar (masaüstü) + BottomNav (mobil) + üst bar — tüm kırılımlarda responsive.

### Faz 2 — Çekirdek navigasyon + yoğun sayfalar ✅ TAMAMLANDI (2026-07-31)
Takvim/ana sayfa (CalendarClient), Seri seçici, Seri hub, Favorites, Settings, Login + pending/blocked/force-signout.

**Özet:** Seri seçici + Favorites'e `SeriesGlowSurface`/seri rengi tutarlılığı getirildi. Seri hub'a sub-navigasyon (Overview/Schedule/Standings/Drivers/Teams/Circuits pill-tab) eklendi. Settings ve auth sayfaları (login/pending/blocked/force-signout) bilinçli olarak değiştirilmedi (Admin panelindeki "nötr/işlevsel alan" kararıyla tutarlı). Takvim'de yan bulgu: `toTitleCase()` yardımcı fonksiyonu "GT"/"WEC" gibi kısaltmaları "Gt"/"Wec" yapıyordu, acronym allowlist eklenerek düzeltildi (`src/lib/utils.ts`).

**Settings — 2026-07-30 karar: değişiklik yok.** Admin paneliyle aynı gerekçe: nötr/işlevsel alan, seri rengi yok. Zaten kod bu şekilde (Account/Appearance/Notifications, düz `bg-card` kutuları).

**Login/pending/blocked/force-signout — 2026-07-30 karar: değişiklik yok.** Ambient glow + grid mockup'ı sunuldu (auth-shell.html), kullanıcı mevcut düz zeminin kalmasını tercih etti. force-signout zaten anlık redirect, görünürlüğü çok düşük, dokunulmadı.

**Seri alt-navigasyonu — 2026-07-30 karar:** Hub (`/[series]`) ve 5 alt sayfa (schedule/standings/drivers/teams/circuits) arasında şu an sadece BackButton var — kardeş sayfalar arası geçiş için hub'a dönmek gerekiyor. Karar: kalıcı bir pill-tab segmented nav eklenecek (Overview/Schedule/Standings/Drivers/Teams/Circuits), ikonlu (lucide-react), aktif sekme seri renginde tint. Uygulamanın genelindeki pill/segmented dil ile tutarlı (Standings Drivers/Teams switcher, takvim seri filtre çipleri) — alt-çizgili sekme alternatifi bu yüzden elendi. Yatay scroll, `[series]/page.tsx:184`'teki mevcut ince-scrollbar utility class'ıyla aynı olacak (`[scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] [&::-webkit-scrollbar]:h-1 ...`). Muhtemelen paylaşılan bir `layout.tsx` ile 6 route'a ortak uygulanır. **Henüz koda dökülmedi**, implementasyon Faz 2 planına eklenecek.

### Faz 3 — Seri alt sayfaları
Schedule, Standings, Drivers + drivers/[id], Teams + teams/[id], Circuits + circuits/[id]. Bileşenler: RaceCard, DriverPhoto, TeamLogo.

### Faz 4 — Yarış hafta sonu (en karmaşık)
`races/[round]` + tüm race bileşenleri: Results/WEC/Qualifying/Practice, SessionTabs, TireStints, RaceControlSection, RaceTimeline, RaceWeatherSection, WeatherChip, Countdown, Circuit foto/layout.

### Faz 5 — Haberler + Admin + PWA
News list + detay, Admin paneli, NotificationSettings, InstallPrompt.

### Faz 6 — Backend uyarlaması (tasarım gereksinimlerine göre)
Her veri-güdümlü bileşen için backend hizalaması: sync adapter'lar / API route'lar / DB şeması, yeni tasarımın ihtiyaç duyduğu alanları (ör. pilot uyruğu/bayrak, ek görsel, sıralama alanları) sağlayacak şekilde güncellenir. [[project-gt3-carrera-datadriven]] notu da bu fazda değerlendirilir. Migration motorsports'un `scripts/migrate.cjs` (drizzle SQL) akışıyla.

**Pist hattı extraction QA notu (2026-07-30):** 24/24 F1 pisti otomatik çıkarıldı (`scripts/extract-track-outlines.mjs`). Görsel QA'da 22'si iyi kalitede; `losail` (Qatar) belirgin şekilde zayıf çıktı (yıldız benzeri, tanınmıyor), `americas` (COTA) orta kalite. İkisi de düşük opaklıkta (0.35) watermark olarak kullanıldığı için şimdilik engel değil, ama ileride `src/lib/track-outlines.generated.ts`'de manuel düzeltme adayı (script'in başındaki "manual override" notuyla işaretlenip elle path güncellenebilir).

**Bekleyen içerik sorunu (2026-07-30 tespit edildi):** `src/lib/circuit-data.ts:9-32`'deki `F1_CIRCUIT_SPECS.drsZones` sabit sayısı ve UI'daki "DRS Zones" etiketi, 2026 sezonunda gelen Active Aero kuralıyla (DRS'in yerini aldı, pilotlar artık neredeyse her yerde kullanabiliyor) kavramsal olarak eskimiş durumda. Bu fazda: ya spec'i 2026 aktif aero kurallarına göre güncelle, ya etiketi/kavramı "Active Aero" olarak yeniden adlandır, ya da anlamını yitirdiği için stat'ı tamamen kaldır. Not: pist fotoğrafları (`getF1CircuitPhotoUrl`) ve F1 resmi CDN pist haritası (`getF1CircuitMapUrl`) bu sorundan etkilenmiyor — ikisi de DRS bölgesi işaretlemesi içermiyor, sadece `drsZones` sayısal alanı etkileniyor.

### Faz 7 — Responsive QA + cila
xs→2xl tüm kırılımlar, açık+koyu tema, erişilebilirlik (focus, reduced-motion, kontrast), performans, PWA. Her faz sonunda Playwright ekran görüntüsü + canlı gözden geçirme.

---

## Kalite zemini (her fazda)
Mobile-first responsive (sm/md/lg/xl/2xl), görünür klavye focus'u, `prefers-reduced-motion` saygısı, yeterli kontrast, i18n TR/EN korunur, tema değişiminde bozulma yok.

**Not (2026-07-31, kullanıcı tekrar vurguladı):** Bu madde her sayfa/bileşen için GERÇEKTEN doğrulanmalı — sadece Faz 7'nin sonuna bırakılmayacak. Faz 0-3'te yapılan değişiklikler şu ana kadar ağırlıklı masaüstü genişliğinde (Browser pane default) doğrulandı, mobil genişlikte (375px civarı) sistematik kontrol edilmedi. Faz 3'ün geri kalanına veya Faz 4'e geçmeden önce, bugüne kadar dokunulan sayfalar (SeriesGlowSurface, SeriesSubNav, calendar kartları, favorites, standings/drivers/teams listeleri) mobil genişlikte de gözden geçirilmeli.

## Doğrulama
Her fazda: build/lint temiz → Playwright ile mobil+masaüstü (+ açık/koyu) ekran görüntüsü → onay → push → CI deploy → canlı kontrol.
