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

**Durum (2026-07-31, kısmen tarandı):** Liste + detay sayfaları (driver/[id], team/[id], circuit/[id]) zaten büyük ölçüde tasarım diliyle tutarlı bulundu (takım rengi hero, stat kartları, sonuç listeleri) — büyük bir redesign işi gerekmedi. DOM-tabanlı bir tarama ile (computed `text-transform:uppercase` kontrolü) CSS class grep'lerinin kaçırdığı 4 uppercase varyantı bulunup düzeltildi. Circuits listesi, Teams listesi, Standings tam sayfa, driver/team detay taranmış, temiz. Ayrıca not: TeamLogo bileşeni düşük çözünürlüklü görünüyor (henüz ele alınmadı, bkz. Task #15).

**✅ TAMAMLANDI (2026-08-03) — kapsamlı detay-sayfa taraması:** `circuits/[id]`, `drivers/[id]`, `teams/[id]`, `DriversContent.tsx`, `circuits/page.tsx`, `teams/page.tsx`, `schedule/page.tsx` tek tek okunup denetlendi. 2 gerçek bug bulundu ve düzeltildi:
1. `circuits/[id]/page.tsx` yaklaşan yarış tarihini koşulsuz `"tr-TR"` ile formatlıyordu (RaceControlSection'ın Faz 4'te düzeltilen `navigator.language` hatasıyla aynı sınıf) → `getLocale()`'a bağlandı.
2. `standings/page.tsx`'te sürücü/takım puan rozetlerinde hardcoded İngilizce `"pts"` metni her zaman gösteriliyordu (TR arayüzde bile) → `standingsPage.pointsAbbr` çeviri anahtarı eklendi (TR: "puan", EN: "pts").

Tümü `tsc --noEmit`/`eslint` temiz, Playwright ile canlı doğrulandı (standings rozetleri "pts", Zandvoort sayfası "August 23, 2026" gösteriyor).

**Yanlış alarm (düzeltilip geri alındı):** `schedule/page.tsx`'teki `RaceTimeline`'ın "şimdi" ayracına `raceStatusT("completed")` ("Tamamlandı") bağlıydı; kullanılmayan `schedulePage.now` ("— Şimdi —") anahtarına bakıp bunu bug sandım ve değiştirdim. Kullanıcı haklı olarak şüphelenip tekrar kontrol etmemi istedi — `CalendarClient.tsx`'teki (ana Takvim sayfası) birebir aynı "now-marker" ayracı da kasıtlı olarak `nowLabel={t("completed")}` kullanıyor, yani "Tamamlandı" etiketi upcoming/past ayracı için **kurulu, tutarlı bir örüntü** — "now" anahtarı muhtemelen kullanılmayan/artık bir çeviri. Değişiklik geri alındı, `schedulePage.now` anahtarına dokunulmadı (silinmesi ayrı bir karar, sorulmadan yapılmadı).

**Bulunan ama kasıtlı olarak dokunulmayan (kullanıcıya soruldu):** Yarış-detayı bileşenleri (QualifyingSection/PracticeSection/TireStints) pozisyon renklerinde `yellow-500/zinc-400/amber-600` ailesini kullanırken, profil sayfaları (driver/[id]'nin `positionBadge`, teams/[id]'nin `positionClass`) `yellow-400/zinc-300/orange-400` ailesini kullanıyor — iki grup kendi içinde tutarlı ama birbirinden farklı. Faz 4'teki F1/WEC birleştirmesi gibi tüm uygulamada tek renk ailesine indirmek mümkün ama 4 dosyayı etkileyen bir tercih meselesi, otomatik düzeltilmedi.

### Faz 4 — Yarış hafta sonu (en karmaşık)
`races/[round]` + tüm race bileşenleri: Results/WEC/Qualifying/Practice, SessionTabs, TireStints, RaceControlSection, RaceTimeline, RaceWeatherSection, WeatherChip, Countdown, Circuit foto/layout.

**1. tur (2026-08-01) tamamlandı — Explore agent taraması + 7 bulgu, hepsi işlendi:**
1. `RaceWeatherSection`'da açık temada görünmez metin/skeleton (`text-white`/`bg-white/8`, `bg-card` üzerinde) → theme-aware token'lara geçirildi.
2. races/[round] hero'su (`SeriesGlowSurface`, 110° gradient+streak) driver/team/circuit'in 135° gradient+köşe-glow formülünden farklıydı → races/[round] o formüle çevrildi (kullanıcı kararı: "hangisi göze daha çok hitap edecekse"). `SeriesGlowSurface` kart-grid'lerde (`/series`, takvim kartları) kalmaya devam ediyor — bilinçli ayrım: küçük kartlarda streak, büyük sayfa hero'larında sade gradient.
3. `RaceControlSection`/`RaceWeatherSection` section header'larında `font-display` eksikti → eklendi.
4. `WECRaceResultsSection`'da hardcoded TR fallback string (`"5 daha göster"` vb.) → `labels.loadMore`/`viewAll` tipte zorunlu yapıldı, fallback kaldırıldı.
5. `RaceControlSection` dil seçimini `navigator.language`'dan yapıyordu → `useLocale()`'a geçirildi (TR arayüz + EN tarayıcı tutarsızlığı giderildi).
6. `RaceResultsSection` ile `WECRaceResultsSection` arasında pozisyon rozeti/sıralama/puan tipografisi tutarsızdı → WEC'in `PositionBadge`'i F1'in daireli-arka-planlı formülüne çevrildi, `tabular-nums` her iki bileşende de standart hale getirildi.
7. Mobil taşma şüphesi (`TireStints` `w-28`, `RaceResultsSection` `grid-cols-2`) → 375px'te ölçülüp doğrulandı, **yanlış pozitif** çıktı (truncate/min-width zaten düzgün çalışıyor), değişiklik yapılmadı.

**2. tur (2026-08-02/03) — SessionTabs/QualifyingSection/PracticeSection ek düzeltmeler:** Kullanıcı isteğiyle PracticeSection'dan gap-ratio çizgileri, mor şimşek (Zap) ikonu ve sağ üst "en hızlı tur" rozeti kaldırıldı; FP tablolarındaki pilot isimleri Qualifying/Race tablolarıyla tutarlı şekilde tıklanabilir hale getirildi (driver sayfasına link). Ayrıca bu süreçte kritik bir backend bug bulunup düzeltildi: F1 practice (FP1/2/3) sonuçları `country_code` alanındaki bir Zod şema uyuşmazlığı yüzünden hiç çekilmiyordu (bkz. commit geçmişi / `src/lib/adapters/f1/openf1.ts`).

**✅ TAMAMLANDI (2026-08-03) — kalan bileşenler tarandı:** `Countdown.tsx`, `WeatherChip.tsx`, `CircuitHeroPhoto.tsx`, `CircuitLayoutImage.tsx`, `TireStints.tsx`, `RaceTimeline.tsx` tek tek okunup denetlendi — hepsi zaten tutarlı (font-display/tabular-nums doğru, locale `getLocale()`'a bağlı, hardcoded string yok, tema-bağımsız renk sorunu yok). Faz 4 bu turla kapandı.

### Faz 5 — Haberler + Admin + PWA
News list + detay, Admin paneli, NotificationSettings, InstallPrompt.

### Faz 6 — Backend uyarlaması (tasarım gereksinimlerine göre)
Her veri-güdümlü bileşen için backend hizalaması: sync adapter'lar / API route'lar / DB şeması, yeni tasarımın ihtiyaç duyduğu alanları (ör. pilot uyruğu/bayrak, ek görsel, sıralama alanları) sağlayacak şekilde güncellenir. [[project-gt3-carrera-datadriven]] notu da bu fazda değerlendirilir. Migration motorsports'un `scripts/migrate.cjs` (drizzle SQL) akışıyla.

**Pist hattı extraction QA notu (2026-07-30):** 24/24 F1 pisti otomatik çıkarıldı (`scripts/extract-track-outlines.mjs`). Görsel QA'da 22'si iyi kalitede; `losail` (Qatar) belirgin şekilde zayıf çıktı (yıldız benzeri, tanınmıyor), `americas` (COTA) orta kalite. İkisi de düşük opaklıkta (0.35) watermark olarak kullanıldığı için şimdilik engel değil, ama ileride `src/lib/track-outlines.generated.ts`'de manuel düzeltme adayı (script'in başındaki "manual override" notuyla işaretlenip elle path güncellenebilir).

**✅ TAMAMLANDI (2026-08-03) — "DRS Zones" sorunu:** Kullanıcı kararı: stat tamamen kaldırılıp güncel resmi veriyle değiştirildi (spekülatif "Active Aero zone sayısı" uydurulmadı). `CircuitSpecs` arayüzünden `drsZones` kaldırıldı; `raceDistanceKm`, `firstGrandPrix`, `fastestLap` eklendi. Veri kaynağı: formula1.com'un `/en/racing/2026/{race}` sayfalarındaki "Circuit" bölümü (subagent ile 23 round tek tek fetch edilip cross-check edildi) + Wikipedia (Madring/Sepang koordinat+viraj sayısı için). Bulgular:
- **Imola 2026 takviminden tamamen düştü**, **Suudi Arabistan GP (Jeddah) iptal edildi** (Ortadoğu'daki durum nedeniyle, telafi yok) — ikisi için de eski statik veri dokunulmadan bırakıldı (fabrikasyon yapılmadı).
- **Bahrain GP'si 2026'da Sepang, Malezya'ya taşındı**, "Bahrain Grand Prix in Malaysia" adıyla (round 16) — Sakhir pisti sadece pre-season test yapıyor. Bahrain'in kendi tarihi verisi (uzunluk/ilk GP/pist rekoru) yine de eklendi çünkü fiziksel pist için hâlâ doğru.
- **Madring (Madrid, round 14) ve Sepang (round 16) yeni circuitId olarak eklendi** — specs, koordinatlar (Wikipedia) ve pist haritası görseli (yeni 2026 CDN deseni: `.../2026/track/2026track{madrid|kualalumpur}detailed.webp`, eski "Circuit maps 16x9" setinde bu ikisi için asset yok, curl ile doğrulandı) hepsi eklendi.
- `circuits/[id]/page.tsx`: "DRS Zones" kartı → "First Grand Prix" kartı; "Yarış mesafesi ≈ X" (hesaplanan tahmin) → resmi `raceDistanceKm` (artık "≈" yok, gerçek değer); yeni "Pist rekoru: {süre} — {pilot} ({yıl})" satırı eklendi.
- Tüm veriler `tsc`/`eslint` temiz, Playwright ile canlı doğrulandı (suzuka/madring/sepang/bahrain sayfaları, TR+EN).

**✅ Pist görseli düzeltmesi (2026-08-03, kullanıcı fark etti):** `getF1CircuitMapUrl` hâlâ eski "Circuit maps 16x9" CDN setini kullanıyordu — URL 200 dönüyor ama görseldeki etiketler hâlâ "DRS Detection Zone" yazıyor (2026 Active Aero kuralıyla artık yanlış terminoloji). Tüm 23+2 circuitId için yeni 2026 CDN deseninin (`.../2026/track/2026track{slug}detailed.webp`) doğru slug'ı tek tek curl ile bulunup doğrulandı (slug'lar pist/şehir adı, ülke adı değil — ör. `suzuka`, `sakhir`, `montecarlo`, `spafrancorchamps`, `lusail`). `F1_CIRCUIT_MAP_NAMES` (eski set) tamamen kaldırıldı, `getF1CircuitMapUrl` artık tek bir güncel slug tablosu kullanıyor. Shanghai + Spa canlı doğrulandı (yeni "Overtake Detection/Activation" etiketleriyle).

**Eksik veri tamamlama (2026-08-03, kullanıcı talebiyle):** `jeddah` (2025 sayfası — Suudi GP 2026'da iptal ama geçmiş veri geçerli), `imola` (Wikipedia — 2026'da takvimde yok, F1.com artık pist sayfası sunmuyor), `sepang` (tur sayısı/mesafe için Wikipedia'nın "Malaysian Grand Prix" makalesi, 1999-2017 dönemi), `bahrain` (2025 sayfası, yarış mesafesi) için eksik alanlar dolduruldu. Yalnızca `madring` (2026'da ilk kez koşulacak, hiç geçmişi yok) hariç tutuldu. Tüm circuit-detay sayfaları (suzuka/madring/sepang/bahrain/jeddah/imola) canlı doğrulandı; `imola` beklendiği gibi 404 veriyor (2026 cache'inde yarışı yok, veri koda eklendi ama şu an ula ılamaz — pist takvime dönerse hazır).

**✅ Bahrain/Jeddah "Yaklaşan" anomalisi çözüldü (2026-08-03):** Kök neden bulundu — Jolpica API'nin kendisi 2026 takvimini doğru veriyor (canlı sorgulandı: 23 round, round 16 = "Bahrain Grand Prix in Malaysia" @ Sepang, ayrı Bahrain/Jeddah round'u yok). Sorun bizim `src/lib/adapters/f1/cancelled-races.ts`'de: Jolpica iptal edilen yarışları API'sinden tamamen sildiği için (sonuç-bazlı iptal tespiti işe yaramıyor), bu dosya Bahrain/Suudi Arabistan yarışlarını `status: "cancelled"`, `round: 900+` ile manuel override olarak enjekte ediyor — bu kısım doğru ve kasıtlı. Asıl bug `circuits/[id]/page.tsx`'teydi: `upcomingRaces = circuitRaces.filter(r => r.status !== "completed")` ifadesi `"cancelled"` durumunu da "yaklaşan" sayıyordu (RaceTimeline.tsx'in zaten doğru yaptığı `status === "cancelled"` ayrımı burada yoktu). Düzeltme: `upcomingRaces` artık sadece `"upcoming"/"live"` durumundakileri alıyor, yeni ayrı bir "İptal" bölümü eklendi (dimmed, tıklanamaz, RaceTimeline'ın cancelled-item deseniyle tutarlı). Canlı doğrulandı (bahrain + jeddah sayfaları).

**Bekleyen (kullanıcı kararıyla sonraki fazlara ertelendi):** [[project-gt3-carrera-datadriven]] — GT3/Carrera Cup bildirimlerinin data-driven yapılması, gerçek-zamanlı scraper verisi olmadan yapılamaz, ayrı bir keşif işi olarak bekletiliyor.

**✅ Faz 6 TAMAMLANDI (2026-08-03).**

### Faz 7 — Responsive QA + cila
xs→2xl tüm kırılımlar, açık+koyu tema, erişilebilirlik (focus, reduced-motion, kontrast), performans, PWA. Her faz sonunda Playwright ekran görüntüsü + canlı gözden geçirme.

**1. tur (2026-08-04) — Faz 4(2.tur)/5/6'da dokunulan yüzeylerin regresyon taraması:** 07-31'deki responsive QA turu bu fazlardan önceydi, o yüzden bu turda dokunulan sayfalar ayrıca tarandı: `races/[round]` (SessionTabs/PracticeSection/QualifyingSection), `news`, `news/[id]`, `admin` (Sync tab), `circuits/[id]` (yeni İptal bölümü + First Grand Prix kartı), `standings`, `schedule`. DOM-tabanlı yatay-taşma kontrolü (`scrollWidth - innerWidth`) 375/390/768/1024/1440/1920/2560/3840px'te, **hem açık hem koyu temada** — hepsi `overflow: 0`. Açık temada görsel spot-check (circuits/bahrain İptal bölümü, races/11 FP1 tablosu, admin Sync tab News butonu) — kontrast/okunabilirlik sorunu yok. Console'da sadece OpenF1 hava durumu API'sinin rate-limit hataları (429/404) var, `WeatherChip` zaten `null` dönüp sessizce gizleniyor, uygulama hatası değil.

**2. tur (2026-08-04) — erişilebilirlik + PWA + Lighthouse:**
- **focus-visible**: Sidebar/Button/Input/Tabs/Badge/Switch primitive'leri zaten `outline-none focus-visible:ring-2` deseniyle doğru kurulmuş. Playwright ile klavye-Tab testi yapıldı, `:focus-visible` gerçekten tetikleniyor ve halka görünür (ekran görüntüsüyle doğrulandı). İlk otomatik test turu yanlış pozitif verdi (settle-delay eksikliği), tekrar kontrol edilip düzeltildi — halüsinasyon riskine karşı bulgu raporlamadan önce doğrulama pratiğine örnek.
- **prefers-reduced-motion**: `globals.css`'te zaten global bir override var (`animation-duration: 0.01ms !important` vb.), `page.emulateMedia({reducedMotion:'reduce'})` ile canlı doğrulandı, çalışıyor.
- **PWA**: `manifest.json` geçerli JSON, 8 ikon dosyası da mevcut, service worker canlıda `activated` durumunda kayıtlı. Sorun yok.
- **Lighthouse (a11y/best-practices/SEO) çalıştırıldı, 2 gerçek bug bulunup düzeltildi:**
  1. `src/app/layout.tsx`'teki global `viewport` config'inde `maximumScale: 1, userScalable: false` vardı — pinch-zoom'u **tüm uygulamada** kapatıyordu (WCAG 1.4.4 ihlali, düşük görüşlü kullanıcılar zoom yapamıyordu). Kaldırıldı.
  2. `/login`, `/pending`, `/blocked`, `/force-signout` sayfalarının hiçbirinde `<main>` landmark yoktu (en dıştaki `<div>` `<main>`'e çevrildi, görsel değişiklik yok). Not: Lighthouse ana sayfayı (`/`) auth olmadan taradığı için otomatik `/login`'e yönlendi, bulgu aslında bu 4 auth-yardımcı sayfa içindi.
  3. `robots.txt` yoktu (istek 404/HTML dönüyordu) → `src/app/robots.ts` eklendi, `Disallow: /` (uygulama tamamen auth-gated, indexlenmemeli — bu yüzden Lighthouse SEO skoru "is-crawlable" ile 91→63 düştü, bu **kasıtlı ve doğru**, regresyon değil).
  - Accessibility skoru: **92 → 100**. Best-practices: 100 (değişmedi). `valid-source-maps` uyarısı sadece Turbopack dev-mode'un vendor chunk'larıyla ilgili, prod build'i yansıtmıyor, aksiyon alınmadı.

**Devam edecek:** kontrast oranı manuel ölçümü (Lighthouse a11y 100 olduğu için düşük öncelik).

**Performans/Core Web Vitals ölçümü — kullanıcı kararı (2026-08-04):** `redesign/vision` main'e merge edilip production'a deploy edildikten SONRA, gerçek production ortamında ölçülecek. Yerel `next build && next start` yerine bu tercih edildi çünkü gerçek sunucu donanımı + gerçek ağ gecikmesi + Cloudflare tunnel katmanı, local prod-build'den daha temsili sonuç verir (local'de loopback ağı sonuçları yapay iyi gösterir). Lighthouse `--only-categories=performance` ile mshub.aykq.org.tr üzerinde koşulacak.

### Faz 8 — Pist sayfası zenginleştirme (2026-08-04'te başlandı)
Kullanıcının circuit-detay sayfası için 4 fikri:

**✅ #4 TAMAMLANDI — Pist görselleri büyütüldü.** `CircuitLayoutImage`'daki sabit `h-40` (160px) kaldırıldı, `aspect-video` (gerçek 1252×704 kaynak oranına yakın) ile değiştirildi — artık viraj numaraları/overtake etiketleri okunuyor. Mobil+masaüstü canlı doğrulandı.

**✅ #2 ve #3 TAMAMLANDI — çok yıllı pist geçmişi + takvim-dışı pistler.** Beklenenden basit çıktı: `getCachedSchedule(slug, season)` zaten `season` parametreli, sorun sadece hiç geçmiş sezonun senkronize edilmemiş olmasıydı (DB sorgusuyla doğrulandı: sadece 2026 vardı). Kullanıcı kararıyla 2021-2025 F1 sezonları `syncScheduleOnly` ile bir kerelik backfill edildi (Imola dahil 4/5 sezonda göründü, 2023 gerçekten iptal edilmişti — Emilia-Romagna sel baskını, veri doğru). Eski satırlar asla silinmediği için gelecekte otomatik birikmeye devam edecek, ekstra cron gerekmiyor.
- `circuits/[id]/page.tsx`: artık `currentYear-5..currentYear` aralığındaki tüm sezonları paralel çekip `circuitId`'ye göre filtreleyip tarihe göre sıralıyor (`fetchCircuitRacesAllYears` helper'ı). Imola gibi pistler artık 404 vermiyor.
- "Bu Sezonun En İyileri" başlığı artık yıl-duyarlı: gerçekten mevcut sezonsa "Bu Sezon (2026)", değilse "Son Yarış ({yıl})" (yeni `latestRace` çeviri anahtarı).
- "Geçmiş Yarışlar" listesine yıl rozeti eklendi (round numaraları yıllar arası çakışabildiği için React key de `{yıl}-{round}` oldu).
- **`races/[round]/page.tsx`'e `?year=` query param desteği eklendi** — daha önce sayfa hep `new Date().getFullYear()` kullanıyordu, geçmiş yıl linkleri yanlış/mevcut yılın verisini gösterirdi. Artık circuit sayfasındaki geçmiş yarış linkleri `/${slug}/races/${round}?year=${yıl}` formatında; parametre yoksa mevcut yıla düşüyor (geriye dönük uyumlu, mevcut linkler değişmedi). Sadece mevcut yıl için "sonuç eksikse canlı kaynaktan çek" fallback'i çalışıyor (geçmiş sezonlar için gereksiz/verimsiz olurdu).
- Canlı doğrulandı: Imola artık tam sayfa gösteriyor (2021/2022/2024/2025, gerçek sonuçlarla), 2021 Emilia Romagna GP linkine tıklayınca doğru yıl/yarış verisi geliyor (Verstappen kazandı — gerçek tarihle eşleşiyor). `tsc`/`eslint` temiz, 375-1440px'te taşma yok.

> **⚠️ BEKLEYEN AKSİYON (production):** 2021-2025 backfill verisi şu an sadece **local dev DB'de**. Kod merge+deploy edildiğinde production DB'sinde bu sezonlar hâlâ yok olacak — aynı backfill'ler (`syncScheduleOnly("f1", year)` VE `adapter.fetchStandings(year, type)` → `setCachedStandings`, 2021-2025) production'da da bir kerelik çalıştırılmalı, yoksa circuit/driver sayfaları prod'da sadece mevcut yılı gösterir (kırılmaz, sadece backlog'un faydası eksik kalır).

**✅ #1 TAMAMLANDI (2026-08-04) — Pist tarihçesi/hikayesi.** Tasarım: `docs/superpowers/specs/2026-08-04-circuit-history-design.md`, plan: `docs/superpowers/plans/2026-08-04-circuit-history.md`. Wikipedia (`extracts` API, lede+ilk bölüm) + f1-circuits.com (`#overview`/`#corners`/`#iconic`/`#history` bölümleri, cheerio) kaynaklarından çekilen ham metin Gemini ile TR/EN özete (2-3 paragraf) dönüştürülüyor, mevcut "Pistler" sync butonuna entegre. Kaynak metin hash'lenip değişmediyse Gemini tekrar çağrılmıyor (maliyet kontrolü — ilk backfill 26 çağrı, sonraki syncler ~0). Kaynaklardaki YouTube/makale linkleri deterministik çıkarılıp özetin altında "İlgili Bağlantılar" listesi olarak gösteriliyor (LLM'e URL yazdırılmıyor, halüsinasyon riski yok). `circuits/[id]/page.tsx`'e yeni "Pist Tarihçesi" kartı eklendi, mevcut specs kartıyla aynı gradient formülü. Canlı doğrulandı: TR/EN, açık/koyu tema, masaüstü/375px mobil, linkli (Suzuka) + linksiz (Istanbul Park) pist, tsc/lint temiz.

Kapsam plandan büyüdü, kullanıcı sorularıyla ortaya çıkan 4 ek iş de aynı oturumda tamamlandı:
1. **Gerçek bug bulundu ve düzeltildi:** Las Vegas'ın `circuitId`'si her yerde `las_vegas` olarak yanlış anahtarlanmıştı — Jolpica'nın (asıl veri kaynağı) kendi circuitId'si `vegas`. 5+1+2 haritada (circuit-data.ts/circuit-scraper.ts/circuit-history-scraper.ts) düzeltildi, bu yüzden Las Vegas pist sayfası muhtemelen hiç specs/layout göstermemişti.
2. **2021-2022 sonrası takvimden düşen 4 pist eklendi:** Portimão/Paul Ricard/Sochi/Istanbul Park — 2021-2025 backfill'de yarışları var ama hiçbir slug haritasında yoklardı. History Wikipedia-only (f1-circuits.com sadece güncel takvimi kapsıyor), specs Wikipedia infobox + kendi DB'mizdeki gerçek tur sayısından hesaplanan `raceDistanceKm`.
3. **Wikipedia infobox specs scraper eklendi:** f1.com sayfası olmayan 7 pist (jeddah/imola/bahrain/portimao/ricard/sochi/istanbul) için length/corners/lap-record artık otomatik Wikipedia'dan çekiliyor (elle yazılan statik seed yerine/üzerine). Çok-config pistlerde (Suzuka: F1+MotoGP) doğru bölüm (`infobox-header` metni "Grand Prix Circuit" ile başlayan) hedefleniyor — canlı doğrulandı, yanlış seri verisi çekilmiyor.
4. **Performans: dondurulmuş pistler için gereksiz re-scrape durduruldu.** F1.com sayfası olmayan 7 pist artık takvim-dışı/frozen kabul ediliyor — veri bir kez başarıyla yakalandıktan sonra sonraki "Pistler" tıklamalarında bu 7 pist için hiç ağ isteği atılmıyor (ne specs ne history), sadece 23 canlı-takvim pisti her seferinde tazeleniyor. Doğrulandı: `updatedAt` damgaları ikinci koşuda byte-byte aynı kaldı.

**Ders (2026-08-04):** "İyi çalışıyor" görünen bir özellik bile (Las Vegas specs) sessizce bozuk olabilir — anahtar isimlendirmesi tek bir veri kaynağına (Jolpica) bağlı olmalı, farklı dosyalarda elle kopyalanan anahtar isimleri zamanla sapabilir.

**Backlog (faza bağlı değil, ileride değerlendirilecek) — Admin panelde hata-log alanı.** Kullanıcı isteği (2026-08-04): sync/scrape/Gemini gibi arka plan işlemlerinde bir hata oluştuğunda, admin panelde hatanın ne olduğunu ve detaylarını kolayca görebileceği bir alan olsun (şu an hatalar sadece server console log'una düşüyor, admin toast'ı özet/generic). Circuit-history özelliğiyle birlikte gündeme geldi ama genel bir ihtiyaç — ayrı bir brainstorm/tasarım gerektirir (nerede saklanacak — DB tablosu mu, ne kadar süre tutulacak, hangi işlemler loglanacak vb.).

**✅ Ek altyapı işi (2026-08-04, kullanıcı fark etti) — statik pist verisinden canlı scraper'a geçiş.** Kullanıcının haklı tespiti: `circuit-data.ts`'deki 2026-08-03'te elle araştırılan veriler (uzunluk/tur/pist rekoru/görsel) statikti — f1.com sezon ilerledikçe (özellikle 2026 Active Aero kuralıyla pist düzenleri gerçekten değişti) sayfalarını güncelleyecek, statik veri zamanla eskiyecekti. Çözüm:
- **Yeni scraper** (`src/lib/adapters/f1/circuit-scraper.ts`, cheerio ile): f1.com'un pist sayfası HTML'i tamamen server-rendered (`curl` ile doğrulandı, headless browser gerekmiyor) — `<dl><dt>/<dd></dl>` yapısından Circuit Length/First Grand Prix/Number of Laps/Fastest lap/Race Distance ve `<img src>`'den pist görseli URL'i güvenilir şekilde parse ediliyor.
- **Yeni DB tablosu** `cached_circuit` (drizzle migration `0006_hesitant_juggernaut.sql`) — `cachedDrivers` ile aynı desen (season-scoped değil, her sync'te en güncel veriyle upsert).
- **`getF1CircuitInfo()`** (circuit-data.ts) — DB'deki taze veriyi statik seed'in üzerine alan-alan bindirir; DB'de hiç veri yoksa (yeni pist, scraper henüz çalışmadı, veya slug haritasında yok — ör. Bahrain/Jeddah/Imola) sorunsuz statik seed'e düşer.
- **Ayrı, düşük sıklıkta cron** (`/api/cron/circuit-data`, günde bir, `docs/cron-setup.md`'ye eklendi) — kullanıcı kararıyla mevcut 6 saatlik tam sync'e dahil edilmedi (23 sayfayı taramak zaman alıyor, f1.com'u sık taramak istemiyoruz).
- **Test sonucu:** local'de 23/23 pist başarıyla scrape edildi, sıfır hata; sonuçlar dünkü elle-araştırılan verilerle karşılaştırıldığında birebir örtüşüyor (çapraz doğrulama) — hatta görsel slug'ları da (`melbourne`, `austin`, `catalunya` vb.) benim elle curl ile bulduklarımla birebir aynı çıktı, çünkü scraper gerçek `<img src>`'i okuyor, slug tahmin etmiyor.
- **✅ Admin panel F1 kategori-bazlı sync butonları eklendi (2026-08-04).** "Tüm seriler" ızgarasına dokunulmadan, altına yeni bir "F1 Detaylı Sync" bölümü eklendi — 5 buton: Takvim/Sonuçlar, Sürücü Puan Durumu, Takım Puan Durumu, Sürücüler, Pistler. `sync.ts`'e 4 yeni granüler fonksiyon eklendi (`syncDriverStandingsOnly`/`syncTeamStandingsOnly`/`syncDriversOnly`, + zaten var olan `syncScheduleOnly`/`syncCircuitData`), `admin/actions.ts`'e karşılık gelen 5 Server Action. **Hepsi sadece mevcut yılı (2026) çeker** — canlı doğrulandı: "Driver Standings" butonuna basınca sadece 2026 satırının `fetched_at`'i güncellendi, 2021-2025 satırları dokunulmadan kaldı. "Circuits" butonu da denendi, 23/23 pist yeniden scrape edildi, admin toast'ı doğru sonuç gösterdi. Mobilde (390px) taşma yok.

**✅ Ek iş (2026-08-04) — geçmiş sezon veri eksikleri tamamlandı.** Kullanıcı yukarıdaki scraper commit'inden sonra 3 soru sordu, ikisi gerçek eksik çıktı:
1. **Sezon sonu standings (puan tablosu) 2021-2025 için hiç çekilmemişti** — sadece yarış-yarış sonuçları backfill edilmişti. `adapter.fetchStandings(year, "driver"|"team")` ile bir kerelik backfill edildi (`setCachedStandings`), toplam 10 satır (5 yıl × 2 tip). **Düzenli sync/cron'lara bağlanmadı** — kullanıcı kararıyla admin panel butonları ve cron job'lar sadece mevcut yılı (2026) çekmeye devam ediyor, geçmiş veri sadece bu tek seferlik script'le girdi.
2. **`drivers/[id]/page.tsx` emekli/eski sürücülerde 404 veriyordu** — sayfa sadece güncel (2026) kadroya ve güncel yıl standings'ine bakıyordu. Artık sürücü bulunamazsa çok-yıllı (2021-2026) yarış sonuçlarından minimal bir profil kuruluyor (isim/kod/numara/takım — `driverName`'i son kelimeye göre bölerek firstName/lastName ayrılıyor, `nationality` boş kalıyor çünkü sonuç verisinde yok). Kimi Räikkönen (`raikkonen`, 2021 sonrası emekli) ile canlı doğrulandı: tam 2021 sezonu (21 yarış) doğru sırayla listeleniyor, her biri doğru yıla tıklanabiliyor.
3. **Kod tekrarını azaltmak için** `getCachedScheduleMultiYear(slug)` `cache.ts`'e taşındı (daha önce circuits/[id]'de yerel bir fonksiyondu) — hem circuit hem driver sayfası artık aynı paylaşılan fonksiyonu kullanıyor. `driversPage.raceResults` çeviri anahtarındaki `{year}` kaldırıldı (artık tek yıla özel değil, çok-yıllı liste).
- Sync/cron davranışı netleştirildi (kullanıcı sorusu #3'ün cevabı, ayrı bir "eksik" değildi): mevcut "F1 Sync" butonu ve 6 saatlik otomatik sync **her zaman sadece mevcut yılı** (2026) çeker — 2021-2025 verisi ve bu yeni standings backfill'i **tekrar tetiklenmeyecek**, sadece DB'de kalıcı olarak duruyor. Bu, kullanıcının bu oturumdaki açık kararı.

---

### Faz 9 — Backlog (2026-08-04'te not edildi, kullanıcı "sırayla ilerleyeceğiz" dedi)

1. **✅ TAMAMLANDI (2026-08-04, commit `38290a4`) — News sayfası otomatik yenileme.** `NewsAutoRefresh` client component eklendi (`src/app/(app)/news/NewsAutoRefresh.tsx`) — 60 saniyede bir (sadece sekme görünürken) `router.refresh()` çağırıyor. `getAllCachedNews` zaten tag-tabanlı (`unstable_cache`, `tags:["news"]`) olduğu için ucuz — veri gerçekten değişmediyse cache'ten anında dönüyor. `NewsListSection`'daki mevcut "yeni öğe" algılama/animasyon mantığı (zaten vardı) sıfırdan dokunulmadan devreye giriyor.
2. **Haber içeriği uyuşmazlığı — muhtemel scraper bug'ı (henüz araştırılmadı).** `http://localhost:3000/news/a9f9e34a-9ac4-4b3d-981a-9640b70213ac` sayfasındaki içerik, kaynak `https://tr.motorsport.com/f1/news/cota-ve-silverstonedan-gizemli-paylasim-guclerimizi-birlestiriyoruz/10844019/` sayfasının içeriğiyle uyuşmuyor. Kök neden araştırılmalı (`motorsportNews.ts` scraper'ı) — yanlış URL eşleşmesi mi, yanlış içerik bloğu mu parse ediliyor, yoksa cache'te eski/başka bir habere mi karışmış? Diğer haberlerde de sistemik mi yoksa izole bir vaka mı, örnekleme ile kontrol edilmeli.
3. **✅ TAMAMLANDI (2026-08-04, commit `57fe99a`) — Sürücü detay sayfası yarış listesi tasarımı.** Yeni `DriverRaceResultsSection.tsx` client component — yarışlar yıla göre gruplanıp collapsible kartlara ayrıldı (en son yıl varsayılan açık, eskiler kapalı, `WECRaceResultsSection`'daki `animate-in` deseniyle tutarlı açılma animasyonu). Canlı doğrulandı: Hamilton (6 yıl, 2026 açık/2021-2025 kapalı) ve Räikkönen (tek yıl, otomatik açık).
4. **Em dash temizliği — uygulama geneli (henüz başlanmadı).** Kod tabanındaki tüm kullanıcıya görünen metinler (i18n JSON'ları, hardcoded string'ler, Gemini'nin ürettiği pist tarihçesi metinleri, scrape edilen haber içerikleri) taranıp em dash (—) karakterleri kaldırılmalı/değiştirilmeli — kullanıcının gerekçesi: insanlar günlük yazıda em dash kullanmaz, yapay/robotik görünüyor. Geniş kapsamlı bir tarama gerektiriyor, kapsam netleştirilmeli (statik metinler mi, DB'deki dinamik içerik mi, ikisi de mi — DB içeriği için tek seferlik migration mı yoksa görüntüleme anında mı temizlenecek).
5. **✅ TAMAMLANDI (2026-08-04, commit `f2d2004`) — Circuit history dil toggle'ı.** `getF1CircuitHistory()` artık `locale` parametresi almadan hem `tr` hem `en` metni birlikte döndürüyor. Yeni `CircuitHistoryCard.tsx` client component kendi TR/EN toggle state'ini tutuyor (varsayılan: uygulamanın o anki dili), sadece bu kartın içeriğini değiştiriyor — sayfanın geri kalanı (başlıklar, nav) uygulama dilinde kalıyor. Canlı doğrulandı: EN arayüzde karttaki toggle TR'ye çevrildiğinde sadece tarihçe metni Türkçe'ye geçti, geri kalan her şey İngilizce kaldı.

---

## Kalite zemini (her fazda)
Mobile-first responsive (sm/md/lg/xl/2xl), görünür klavye focus'u, `prefers-reduced-motion` saygısı, yeterli kontrast, i18n TR/EN korunur, tema değişiminde bozulma yok.

**Not (2026-07-31, kullanıcı 2 kez vurguladı):** Bu madde her sayfa/bileşen için GERÇEKTEN doğrulanmalı — sadece Faz 7'nin sonuna bırakılmayacak. Faz 0-3'te yapılan değişiklikler şu ana kadar ağırlıklı masaüstü genişliğinde (Browser pane default ~800-950px) doğrulandı, diğer kırılımlar sistematik kontrol edilmedi.

**Test edilecek somut kırılım seti:**
- Mobil: 375px (iPhone SE/mini sınıfı), 390-430px (modern telefon)
- Tablet: 768px (dikey), 1024px (yatay)
- Masaüstü: 1280px, 1440px, 1920px
- Yüksek çözünürlük: 2560px (1440p/QHD), 3840px (4K), 7680px (8K) — bu genişliklerde `max-w-3xl`/`max-w-2xl` gibi container sınırları olan sayfalar büyük olasılıkla sorunsuz (içerik ortada sabit genişlikte kalır), ama sidebar+içerik oranı, arka plan/gradient dolgular, tam-genişlik kullanan öğeler (SeriesGlowSurface, calendar grid) bu genişliklerde ayrıca gözle kontrol edilmeli — çok geniş boş alan veya orantısız büyüme olabilir.

Faz 3'ün geri kalanına veya Faz 4'e geçmeden önce, bugüne kadar dokunulan sayfalar (SeriesGlowSurface, SeriesSubNav, calendar kartları, favorites, standings/drivers/teams listeleri) bu kırılım setinde gözden geçirilmeli.

**Doğrulama (2026-07-31 tamamlandı):** 375/768/1024/1440/3840/7680px genişliklerinde, 8+ sayfada (takvim, series, favorites, seri hub, standings, drivers, teams, race detay, admin) DOM-tabanlı yatay-taşma (`document.body.scrollWidth - viewportWidth`) kontrolü yapıldı — tamamı `overflow: 0`. Sidebar↔BottomNav geçişi 768px'de (`md` breakpoint) temiz, çakışma yok. Yüksek çözünürlükte (4K/8K) içerik `max-w-3xl` ile okunur genişlikte kalıyor, kalan alan koyu arka planla doluyor (jarring boşluk yok). Ekran görüntüsü alınamadığı için görsel kontrol DOM ölçümleriyle yapıldı — pixel-seviye bir görsel QA (Playwright screenshot) ileride hâlâ faydalı olabilir ama şu an bilinen bir kırılma yok.

## Doğrulama
Her fazda: build/lint temiz → Playwright ile mobil+masaüstü (+ açık/koyu) ekran görüntüsü → onay → push → CI deploy → canlı kontrol.
