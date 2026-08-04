import crypto from "node:crypto";
import * as cheerio from "cheerio";

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
  vegas: "Las Vegas Strip Circuit", // Jolpica'nın circuitId'si "vegas" (las_vegas değil)
  losail: "Lusail International Circuit",
  yas_marina: "Yas Marina Circuit",
  madring: "Madring",
  sepang: "Sepang International Circuit",
  bahrain: "Bahrain International Circuit",
  // Dropped from the calendar after 2021-2022 (COVID-era substitutes / Russia sanctions /
  // France dropped) but still present in our 2021-2025 schedule backfill — added 2026-08-04
  // so their circuit detail pages get history too. No f1-circuits.com entry for any of these
  // (that site only covers the current calendar) — Wikipedia-only, handled gracefully.
  portimao: "Algarve International Circuit",
  ricard: "Circuit Paul Ricard",
  sochi: "Sochi Autodrom", // Wikipedia renamed the article to "Sirius Autodrom" — resolved via redirects=1 below
  istanbul: "Istanbul Park",
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
  vegas: "las-vegas-strip-circuit",
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
    // redirects=1: some article titles get renamed (e.g. "Sochi Autodrom" → "Sirius Autodrom"
    // after 2022) — without this, a stale title returns an empty extract instead of an error,
    // which would otherwise silently look like "no history" for that circuit.
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
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

const F1_CIRCUITS_UA = "Mozilla/5.0 (compatible; motorsports-hub/1.0)";
const HISTORY_SECTION_SELECTORS = ["#overview", "#corners", "#iconic", "#history"];
const MAX_LINKS = 5;

async function fetchF1CircuitsComHistory(
  slug: string
): Promise<{ text: string; links: { url: string; label: string }[] } | null> {
  try {
    const res = await fetchWithTimeout(`https://f1-circuits.com/circuits/${slug}`, F1_CIRCUITS_UA);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const textParts: string[] = [];
    const links: { url: string; label: string }[] = [];
    const seenUrls = new Set<string>();

    for (const selector of HISTORY_SECTION_SELECTORS) {
      const $section = $(selector);
      if ($section.length === 0) continue;

      $section.find("h2, h3, p").each((_, el) => {
        const text = $(el).text().trim();
        if (text) textParts.push(text);
      });

      $section.find("a[href^='http']").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || seenUrls.has(href)) return;
        try {
          if (new URL(href).hostname === "f1-circuits.com") return;
        } catch {
          return;
        }
        seenUrls.add(href);
        const label = $(el).attr("aria-label")?.trim() || $(el).text().trim() || href;
        links.push({ url: href, label });
      });
    }

    const text = textParts.join("\n\n").trim();
    return text ? { text, links: links.slice(0, MAX_LINKS) } : null;
  } catch {
    return null;
  }
}

export interface ScrapedCircuitHistory {
  circuitName: string;
  rawText: string;
  sourceHash: string;
  links: { url: string; label: string }[];
}

export async function scrapeCircuitHistory(circuitId: string): Promise<ScrapedCircuitHistory | null> {
  const wikiTitle = WIKIPEDIA_CIRCUIT_TITLES[circuitId];
  const f1cSlug = F1_CIRCUITS_COM_SLUGS[circuitId];
  if (!wikiTitle && !f1cSlug) return null;

  const [wikiText, f1cResult] = await Promise.all([
    wikiTitle ? fetchWikipediaHistoryText(wikiTitle) : Promise.resolve(null),
    f1cSlug ? fetchF1CircuitsComHistory(f1cSlug) : Promise.resolve(null),
  ]);

  const parts: string[] = [];
  if (wikiText) parts.push(wikiText);
  if (f1cResult?.text) parts.push(f1cResult.text);
  if (parts.length === 0) return null;

  const normalized = parts.join("\n\n---\n\n").replace(/\s+/g, " ").trim();
  const sourceHash = crypto.createHash("sha256").update(normalized).digest("hex");

  return {
    circuitName: wikiTitle ?? f1cSlug!.replace(/-/g, " "),
    rawText: normalized,
    sourceHash,
    links: f1cResult?.links ?? [],
  };
}
