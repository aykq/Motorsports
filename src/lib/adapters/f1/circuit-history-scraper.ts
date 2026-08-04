import crypto from "node:crypto";

const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, userAgent: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

// circuitId → English Wikipedia article title. Verified live (curl/Wikipedia search API,
// 2026-08-04) — every title below resolves to a real article.
export const WIKIPEDIA_CIRCUIT_TITLES: Record<string, string> = {
  jeddah: "Jeddah Corniche Circuit",
  albert_park: "Albert Park Circuit",
  suzuka: "Suzuka Circuit",
  shanghai: "Shanghai International Circuit",
  miami: "Miami International Autodrome",
  imola: "Imola Circuit",
  monaco: "Circuit de Monaco",
  villeneuve: "Circuit Gilles Villeneuve",
  catalunya: "Circuit de Barcelona-Catalunya",
  red_bull_ring: "Red Bull Ring",
  silverstone: "Silverstone Circuit",
  hungaroring: "Hungaroring",
  spa: "Circuit de Spa-Francorchamps",
  zandvoort: "Circuit Zandvoort",
  monza: "Monza Circuit",
  baku: "Baku City Circuit",
  marina_bay: "Marina Bay Street Circuit",
  americas: "Circuit of the Americas",
  rodriguez: "Autódromo Hermanos Rodríguez",
  interlagos: "Interlagos Circuit",
  las_vegas: "Las Vegas Strip Circuit",
  losail: "Lusail International Circuit",
  yas_marina: "Yas Marina Circuit",
  madring: "Madring",
  sepang: "Sepang International Circuit",
  bahrain: "Bahrain International Circuit",
};

// circuitId → f1-circuits.com URL slug. Verified live (curl, 2026-08-04) — all 200 OK.
// "sepang" has no entry: the 2026 "Bahrain GP in Malaysia" hasn't happened yet, the site
// hasn't added the page. scrapeCircuitHistory() falls back to Wikipedia-only for it.
export const F1_CIRCUITS_COM_SLUGS: Record<string, string> = {
  jeddah: "jeddah-corniche-circuit",
  albert_park: "albert-park-circuit",
  suzuka: "suzuka-international-racing-course",
  shanghai: "shanghai-international-circuit",
  miami: "miami-international-autodrome",
  imola: "imola-circuit",
  monaco: "circuit-de-monaco",
  villeneuve: "circuit-gilles-villeneuve",
  catalunya: "circuit-de-barcelona-catalunya",
  red_bull_ring: "red-bull-ring",
  silverstone: "silverstone-circuit",
  hungaroring: "hungaroring",
  spa: "circuit-de-spa-francorchamps",
  zandvoort: "circuit-zandvoort",
  monza: "monza-circuit",
  baku: "baku-city-circuit",
  marina_bay: "marina-bay-street-circuit",
  americas: "circuit-of-the-americas",
  rodriguez: "autodromo-hermanos-rodriguez",
  interlagos: "interlagos-circuit",
  las_vegas: "las-vegas-strip-circuit",
  losail: "lusail-international-circuit",
  yas_marina: "yas-marina-circuit",
  madring: "madring",
  bahrain: "bahrain-international-circuit",
};

const WIKIPEDIA_UA = "motorsports-hub/1.0 (circuit history sync; contact: asdesra@gmail.com)";

// Unlabeled lede + body of the first "== Heading ==" section (whatever it's called —
// "Introduction", "History", etc. depending on the article), cut before the second heading.
function extractWikipediaLedeAndFirstSection(fullText: string): string | null {
  const match = fullText.match(/^([\s\S]*?)\n==\s*[^=].*?\s*==\n([\s\S]*?)(?=\n==[^=]|$)/);
  if (!match) return fullText.trim() || null;
  const [, lede, firstSection] = match;
  const combined = `${lede.trim()}\n\n${firstSection.trim()}`.trim();
  return combined || null;
}

async function fetchWikipediaHistoryText(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json`;
    const res = await fetchWithTimeout(url, WIKIPEDIA_UA);
    if (!res.ok) return null;

    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as { extract?: string; missing?: unknown } | undefined;
    if (!page || page.missing !== undefined || !page.extract) return null;

    return extractWikipediaLedeAndFirstSection(page.extract);
  } catch {
    return null;
  }
}
