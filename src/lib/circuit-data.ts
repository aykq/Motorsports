import { getCachedCircuitData } from "@/lib/cache";

export interface CircuitSpecs {
  lengthKm: number;
  corners: number;
  officialLaps?: number;
  raceDistanceKm?: number;
  firstGrandPrix?: number;
  fastestLap?: { time: string; driver: string; year: number };
}

// Kaynak: formula1.com/en/racing/2026/{race} sayfalarının "Circuit" bölümü + Wikipedia (Madring/Sepang için)
// 2026-08-03'te güncellendi: drsZones kaldırıldı (2026 Active Aero kuralıyla kavramsal olarak eskidi),
// yerine raceDistanceKm/firstGrandPrix/fastestLap eklendi. jeddah ve imola 2026 takviminde yok
// (Suudi Arabistan GP'si iptal, Imola takvimden düştü) — eski veriler dokunulmadan bırakıldı.
const F1_CIRCUIT_SPECS: Record<string, CircuitSpecs> = {
  bahrain:        { lengthKm: 5.412, corners: 15, officialLaps: 57, raceDistanceKm: 308.238, firstGrandPrix: 2004, fastestLap: { time: "1:31.447", driver: "Pedro de la Rosa", year: 2005 } }, // 2026'da sadece pre-season test, GP Sepang'a taşındı
  jeddah:         { lengthKm: 6.174, corners: 27, officialLaps: 50, raceDistanceKm: 308.450, firstGrandPrix: 2021, fastestLap: { time: "1:30.734", driver: "Lewis Hamilton", year: 2021 } }, // Suudi Arabistan GP 2026'da tamamen iptal, veri 2025 sayfasından
  albert_park:    { lengthKm: 5.278, corners: 16, officialLaps: 58, raceDistanceKm: 306.124, firstGrandPrix: 1996, fastestLap: { time: "1:19.813", driver: "Charles Leclerc", year: 2024 } },
  suzuka:         { lengthKm: 5.807, corners: 18, officialLaps: 53, raceDistanceKm: 307.471, firstGrandPrix: 1987, fastestLap: { time: "1:30.965", driver: "Kimi Antonelli", year: 2025 } },
  shanghai:       { lengthKm: 5.451, corners: 16, officialLaps: 56, raceDistanceKm: 305.066, firstGrandPrix: 2004, fastestLap: { time: "1:32.238", driver: "Michael Schumacher", year: 2004 } },
  miami:          { lengthKm: 5.412, corners: 19, officialLaps: 57, raceDistanceKm: 308.326, firstGrandPrix: 2022, fastestLap: { time: "1:29.708", driver: "Max Verstappen", year: 2023 } },
  imola:          { lengthKm: 4.909, corners: 19, officialLaps: 63, raceDistanceKm: 309.051, firstGrandPrix: 1980, fastestLap: { time: "1:15.484", driver: "Lewis Hamilton", year: 2020 } }, // 2026 takviminde yok, veri Wikipedia'dan (F1.com artık takvim dışı pist sayfası sunmuyor)
  monaco:         { lengthKm: 3.337, corners: 19, officialLaps: 78, raceDistanceKm: 260.286, firstGrandPrix: 1950, fastestLap: { time: "1:12.909", driver: "Lewis Hamilton", year: 2021 } },
  villeneuve:     { lengthKm: 4.361, corners: 14, officialLaps: 70, raceDistanceKm: 305.270, firstGrandPrix: 1978, fastestLap: { time: "1:13.078", driver: "Valtteri Bottas", year: 2019 } },
  catalunya:      { lengthKm: 4.657, corners: 16, officialLaps: 66, raceDistanceKm: 307.236, firstGrandPrix: 1991, fastestLap: { time: "1:15.743", driver: "Oscar Piastri", year: 2025 } },
  red_bull_ring:  { lengthKm: 4.326, corners: 10, officialLaps: 71, raceDistanceKm: 307.018, firstGrandPrix: 1970, fastestLap: { time: "1:07.924", driver: "Oscar Piastri", year: 2025 } },
  silverstone:    { lengthKm: 5.891, corners: 18, officialLaps: 52, raceDistanceKm: 306.198, firstGrandPrix: 1950, fastestLap: { time: "1:27.097", driver: "Max Verstappen", year: 2020 } },
  hungaroring:    { lengthKm: 4.381, corners: 14, officialLaps: 70, raceDistanceKm: 306.630, firstGrandPrix: 1986, fastestLap: { time: "1:16.627", driver: "Lewis Hamilton", year: 2020 } },
  spa:            { lengthKm: 7.004, corners: 19, officialLaps: 44, raceDistanceKm: 308.054, firstGrandPrix: 1950, fastestLap: { time: "1:44.701", driver: "Sergio Perez", year: 2024 } },
  zandvoort:      { lengthKm: 4.259, corners: 14, officialLaps: 72, raceDistanceKm: 306.587, firstGrandPrix: 1952, fastestLap: { time: "1:11.097", driver: "Lewis Hamilton", year: 2021 } },
  monza:          { lengthKm: 5.793, corners: 11, officialLaps: 53, raceDistanceKm: 306.720, firstGrandPrix: 1950, fastestLap: { time: "1:20.901", driver: "Lando Norris", year: 2025 } },
  baku:           { lengthKm: 6.003, corners: 20, officialLaps: 51, raceDistanceKm: 306.049, firstGrandPrix: 2016, fastestLap: { time: "1:43.009", driver: "Charles Leclerc", year: 2019 } },
  marina_bay:     { lengthKm: 4.927, corners: 23, officialLaps: 62, raceDistanceKm: 305.337, firstGrandPrix: 2008, fastestLap: { time: "1:33.808", driver: "Lewis Hamilton", year: 2025 } },
  americas:       { lengthKm: 5.513, corners: 20, officialLaps: 56, raceDistanceKm: 308.405, firstGrandPrix: 2012, fastestLap: { time: "1:36.169", driver: "Charles Leclerc", year: 2019 } },
  rodriguez:      { lengthKm: 4.304, corners: 17, officialLaps: 71, raceDistanceKm: 305.354, firstGrandPrix: 1963, fastestLap: { time: "1:17.774", driver: "Valtteri Bottas", year: 2021 } },
  interlagos:     { lengthKm: 4.309, corners: 15, officialLaps: 71, raceDistanceKm: 305.879, firstGrandPrix: 1973, fastestLap: { time: "1:10.540", driver: "Valtteri Bottas", year: 2018 } },
  vegas:          { lengthKm: 6.201, corners: 17, officialLaps: 50, raceDistanceKm: 309.958, firstGrandPrix: 2023, fastestLap: { time: "1:33.365", driver: "Max Verstappen", year: 2025 } }, // Jolpica'nın kendi circuitId'si "vegas" (las_vegas değil) — anahtar buna göre düzeltildi
  losail:         { lengthKm: 5.419, corners: 16, officialLaps: 57, raceDistanceKm: 308.611, firstGrandPrix: 2021, fastestLap: { time: "1:22.384", driver: "Lando Norris", year: 2024 } },
  yas_marina:     { lengthKm: 5.281, corners: 16, officialLaps: 58, raceDistanceKm: 306.183, firstGrandPrix: 2009, fastestLap: { time: "1:25.637", driver: "Kevin Magnussen", year: 2024 } },
  // 2026'da yeni: Madrid (round 14, ilk kez), Sepang (round 16, "Bahrain GP in Malaysia" adıyla)
  madring:        { lengthKm: 5.416, corners: 22, officialLaps: 57, raceDistanceKm: 308.524, firstGrandPrix: 2026 },
  sepang:         { lengthKm: 5.543, corners: 15, officialLaps: 56, raceDistanceKm: 310.408, firstGrandPrix: 1999, fastestLap: { time: "1:34.080", driver: "Sebastian Vettel", year: 2017 } }, // tur/mesafe verisi 1999-2017 Malezya GP'sinden (Wikipedia) — 2026'daki "Bahrain GP in Malaysia" için henüz resmi rakam yok
  // 2021-2022 sonrası takvimden düştü (COVID-dönemi yedekleri / Rusya yaptırımları / Fransa
  // takvimden çıktı) ama 2021-2025 backfill'inde yarışları var. Uzunluk/viraj/pist rekoru
  // Wikipedia'dan (2026-08-04), tur sayısı kendi DB'mizdeki gerçek yarış sonucundan (results[0].laps),
  // raceDistanceKm = lengthKm × laps hesaplanmıştır (resmi F1.com rakamı yok, tahmin değil hesap).
  portimao:       { lengthKm: 4.653, corners: 15, officialLaps: 66, raceDistanceKm: 307.098, firstGrandPrix: 2020, fastestLap: { time: "1:18.750", driver: "Lewis Hamilton", year: 2020 } },
  ricard:         { lengthKm: 5.842, corners: 15, officialLaps: 53, raceDistanceKm: 309.626, firstGrandPrix: 2018, fastestLap: { time: "1:32.740", driver: "Sebastian Vettel", year: 2019 } }, // firstGrandPrix modern-dönem dönüşü (1971-1990 arası farklı layout, kıyaslanmıyor)
  sochi:          { lengthKm: 5.848, corners: 18, officialLaps: 53, raceDistanceKm: 309.944, firstGrandPrix: 2014, fastestLap: { time: "1:35.761", driver: "Lewis Hamilton", year: 2019 } },
  istanbul:       { lengthKm: 5.338, corners: 14, officialLaps: 58, raceDistanceKm: 309.604, firstGrandPrix: 2005, fastestLap: { time: "1:24.770", driver: "Juan Pablo Montoya", year: 2005 } },
};

export function getF1CircuitSpecs(circuitId: string): CircuitSpecs | null {
  return F1_CIRCUIT_SPECS[circuitId] ?? null;
}

/**
 * cached_circuit'teki (f1.com'dan periyodik scrape edilen, bkz. circuit-scraper.ts)
 * en güncel veriyi statik seed'in (F1_CIRCUIT_SPECS/getF1CircuitMapUrl) üzerine
 * alan-alan bindirir. Scraper hiç çalışmadıysa veya bir alanı çekemediyse seed
 * değeri kullanılır — sayfa hiçbir zaman bomboş kalmaz.
 */
export async function getF1CircuitInfo(
  circuitId: string
): Promise<{ specs: CircuitSpecs | null; mapUrl: string | null }> {
  const scraped = await getCachedCircuitData("f1", circuitId);
  const seed = getF1CircuitSpecs(circuitId);
  const seedMapUrl = getF1CircuitMapUrl(circuitId);

  if (!scraped) return { specs: seed, mapUrl: seedMapUrl };

  const specs: CircuitSpecs | null =
    seed || scraped.lengthKm
      ? {
          lengthKm: scraped.lengthKm ?? seed?.lengthKm ?? 0,
          corners: scraped.corners ?? seed?.corners ?? 0,
          officialLaps: scraped.officialLaps ?? seed?.officialLaps,
          raceDistanceKm: scraped.raceDistanceKm ?? seed?.raceDistanceKm,
          firstGrandPrix: scraped.firstGrandPrix ?? seed?.firstGrandPrix,
          fastestLap: scraped.fastestLap ?? seed?.fastestLap,
        }
      : null;

  return { specs, mapUrl: scraped.trackImageUrl ?? seedMapUrl };
}

// F1 media CDN circuit layout icons 4x3 (Jolpica circuit ID → CDN slug)
const F1_CIRCUIT_LAYOUT_SLUGS: Record<string, string> = {
  bahrain:       "bahrain",
  jeddah:        "jeddah",
  albert_park:   "australia",
  suzuka:        "japan",
  shanghai:      "china",
  miami:         "miami",
  imola:         "emilia_romagna",
  monaco:        "monaco",
  villeneuve:    "canada",
  catalunya:     "spain",
  red_bull_ring: "austria",
  silverstone:   "great_britain",
  hungaroring:   "hungary",
  spa:           "belgium",
  zandvoort:     "netherlands",
  monza:         "italy",
  baku:          "azerbaijan",
  marina_bay:    "singapore",
  americas:      "usa",
  rodriguez:     "mexico",
  interlagos:    "brazil",
  vegas:         "las_vegas",
  losail:        "qatar",
  yas_marina:    "abu_dhabi",
  // Eski (2018-redesign-assets) set takvim-dışı pistleri de içeriyor — curl ile doğrulandı.
  portimao:      "portugal",
  ricard:        "france",
  sochi:         "russia",
  istanbul:      "turkey",
};

export function getF1CircuitLayoutUrl(circuitId: string): string | null {
  const slug = F1_CIRCUIT_LAYOUT_SLUGS[circuitId];
  if (!slug) return null;
  return `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/${slug}.png`;
}

// F1 media CDN 2026 pist görselleri (Jolpica circuit ID → CDN slug).
// 2026-08-03'te eski "Circuit maps 16x9" setinden (content/dam/.../2018-redesign-assets/...)
// buna geçildi: eski set hâlâ 200 dönüyor ama görseldeki etiketler "DRS Detection Zone" gibi
// artık yanlış terminolojiyi taşıyor (2026 Active Aero kuralıyla DRS kavramı kalktı);
// yeni CDN yolundaki görseller "Overtake Detection/Activation" ile güncel. Her circuitId
// curl ile tek tek doğrulandı (bkz. sohbet geçmişi) — tüm slug'lar pist/şehir adı, ülke adı değil.
const F1_CIRCUIT_MAP_SLUGS_2026: Record<string, string> = {
  bahrain:       "sakhir",
  jeddah:        "jeddah",
  albert_park:   "melbourne",
  suzuka:        "suzuka",
  shanghai:      "shanghai",
  miami:         "miami",
  monaco:        "montecarlo",
  villeneuve:    "montreal",
  catalunya:     "catalunya",
  red_bull_ring: "spielberg",
  silverstone:   "silverstone",
  hungaroring:   "hungaroring",
  spa:           "spafrancorchamps",
  zandvoort:     "zandvoort",
  monza:         "monza",
  baku:          "baku",
  marina_bay:    "singapore",
  americas:      "austin",
  rodriguez:     "mexicocity",
  interlagos:    "interlagos",
  vegas:         "lasvegas",
  losail:        "lusail",
  yas_marina:    "yasmarina",
  madring:       "madrid",
  sepang:        "kualalumpur",
  // imola: 2026 takviminde yok, yeni CDN'de karşılığı doğrulanmadı — eski asset de kalmadı, null döner.
};

export function getF1CircuitMapUrl(circuitId: string): string | null {
  const slug = F1_CIRCUIT_MAP_SLUGS_2026[circuitId];
  if (!slug) return null;
  return `https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000001/common/f1/2026/track/2026track${slug}detailed.webp`;
}

// Jolpica circuit ID → [lat, lng]
const F1_CIRCUIT_COORDS: Record<string, [number, number]> = {
  bahrain:       [26.0325,  50.5106],
  jeddah:        [21.6319,  39.1044],
  albert_park:   [-37.8497, 144.9680],
  suzuka:        [34.8431,  136.5407],
  shanghai:      [31.3389,  121.2198],
  miami:         [25.9581,  -80.2389],
  imola:         [44.3439,  11.7167],
  monaco:        [43.7347,   7.4206],
  villeneuve:    [45.5000,  -73.5228],
  catalunya:     [41.5700,   2.2611],
  red_bull_ring: [47.2197,  14.7647],
  silverstone:   [52.0786,  -1.0169],
  hungaroring:   [47.5789,  19.2486],
  spa:           [50.4372,   5.9714],
  zandvoort:     [52.3888,   4.5409],
  monza:         [45.6156,   9.2811],
  baku:          [40.3725,  49.8533],
  marina_bay:    [1.2914,   103.8640],
  americas:      [30.1328,  -97.6411],
  rodriguez:     [19.4042,  -99.0907],
  interlagos:    [-23.7036, -46.6997],
  vegas:         [36.1147, -115.1728],
  losail:        [25.4900,   51.4542],
  yas_marina:    [24.4672,   54.6031],
  madring:       [40.4653,  -3.6153],
  sepang:        [2.7606,  101.7375],
  // Kendi race verimizdeki circuitLat/circuitLng'den (Jolpica) alındı.
  portimao:      [37.2270,  -8.6267],
  ricard:        [43.2506,   5.7917],
  sochi:         [43.4057,  39.9578],
  istanbul:      [40.9517,  29.4050],
};

export function getF1CircuitCoords(circuitId: string): [number, number] | null {
  return F1_CIRCUIT_COORDS[circuitId] ?? null;
}

// Circuit photos — kullanıcı tarafından public/f1/circuits/{circuitId}.{ext} konumuna yüklenecek
// Dosyalar yüklendiğinde getF1CircuitPhotoUrl fonksiyonu güncellenir
const F1_CIRCUIT_PHOTOS: Record<string, string> = {
  bahrain:       "/f1/circuits/bahrain.webp",
  jeddah:        "/f1/circuits/jeddah.webp",
  albert_park:   "/f1/circuits/australia.webp",
  suzuka:        "/f1/circuits/japanese.webp",
  shanghai:      "/f1/circuits/chinese.webp",
  miami:         "/f1/circuits/miami.webp",
  imola:         "/f1/circuits/imola.webp",
  monaco:        "/f1/circuits/monaco.webp",
  villeneuve:    "/f1/circuits/canadian.webp",
  catalunya:     "/f1/circuits/spanish.webp",
  red_bull_ring: "/f1/circuits/red-bull-ring.webp",
  silverstone:   "/f1/circuits/silverstone.webp",
  hungaroring:   "/f1/circuits/hungaroring.webp",
  spa:           "/f1/circuits/spa.webp",
  zandvoort:     "/f1/circuits/zandvoort.webp",
  monza:         "/f1/circuits/monza.webp",
  baku:          "/f1/circuits/azerbaijan.webp",
  marina_bay:    "/f1/circuits/singapore.webp",
  americas:      "/f1/circuits/us-gp.webp",
  rodriguez:     "/f1/circuits/mexico.webp",
  interlagos:    "/f1/circuits/sao-paulo.webp",
  vegas:         "/f1/circuits/las-vegas.webp",
  losail:        "/f1/circuits/qatar.webp",
  yas_marina:    "/f1/circuits/abu-dhabi.webp",
};

export function getF1CircuitPhotoUrl(circuitId: string): string | null {
  return F1_CIRCUIT_PHOTOS[circuitId] ?? null;
}
