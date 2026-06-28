import * as cheerio from "cheerio";
import type { RaceResult } from "@/types/series";

const BASE = "https://www.motorsport.com";
const TIMEOUT_MS = 15_000;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; motorsports-hub/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── URL Discovery ────────────────────────────────────────────────────────────

interface EventLink {
  slug: string;
  url: string;
}

async function scrapeF1ResultsIndex(season: number): Promise<EventLink[]> {
  const html = await fetchPage(`${BASE}/f1/results/${season}/`);
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: EventLink[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/f1\/results\/\d+\/([^/?#]+)\//);
    if (!m) return;
    const slug = m[1];
    // Pre-season tests ve diğer non-race eventleri filtrele
    if (seen.has(slug) || /pre.season|pre_season|test/i.test(slug)) return;
    seen.add(slug);
    links.push({ slug, url: `${BASE}/f1/results/${season}/${slug}/` });
  });

  return links;
}

function findF1EventUrl(raceName: string, links: EventLink[]): string | null {
  const keywords = raceName
    .toLowerCase()
    .replace(/grand prix/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  for (const link of links) {
    const slugWords = link.slug.toLowerCase().replace(/-/g, " ");
    if (keywords.some((k) => slugWords.includes(k))) {
      return link.url;
    }
  }
  return null;
}

// ─── Results Scraping ─────────────────────────────────────────────────────────

async function scrapeResultsPage(url: string): Promise<RaceResult[]> {
  const html = await fetchPage(`${url}?st=RACE`);
  const $ = cheerio.load(html);
  const results: RaceResult[] = [];

  $("table").first().find("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (!cells.length) return;

    const posText = $(cells[0]).text().trim();
    const pos = parseInt(posText);
    if (isNaN(pos) || pos < 1 || pos > 30) return;

    const pilotTd = $(cells[1]);
    const driverName = pilotTd.find(".name-short").first().text().trim();
    const team = pilotTd.find(".team").first().text().trim();
    const driverHref = pilotTd.find("a").first().attr("href") ?? "";
    const driverIdMatch = driverHref.match(/\/driver\/([^/]+)\//);
    const driverId = driverIdMatch?.[1] ?? driverName.toLowerCase().replace(/\s+/g, "-");

    const driverNumber = parseInt($(cells[2]).text().trim()) || undefined;
    const laps = parseInt($(cells[4]).text().trim()) || undefined;

    // Time column: winner has total race time; others have "+gap" or "+N Lap(s)"
    const timeRaw = $(cells[5]).text().replace(/\s+/g, " ").trim();
    const lapGapMatch = timeRaw.match(/^(\+\d+)\s+(Lap|Laps)$/i);
    const gapMatch = timeRaw.match(/^(\+\S+)/);
    const time = pos === 1 ? timeRaw : undefined;
    let gap: string | undefined;
    if (pos !== 1) {
      if (lapGapMatch) {
        const count = parseInt(lapGapMatch[1].slice(1));
        gap = `${lapGapMatch[1]} ${count === 1 ? "Lap" : "Laps"}`;
      } else {
        gap = gapMatch?.[1] ?? timeRaw;
      }
    }

    const points = parseFloat($(cells[9]).text().trim()) || 0;
    const retirementText = $(cells[10]).text().trim();

    results.push({
      position: pos,
      driverId,
      driverName,
      driverNumber,
      team,
      time,
      gap,
      points,
      status: retirementText || "Finished",
      laps,
    });
  });

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function scrapeF1RaceResults(
  season: number,
  raceName: string
): Promise<RaceResult[]> {
  try {
    const index = await scrapeF1ResultsIndex(season);
    if (!index.length) return [];
    const url = findF1EventUrl(raceName, index);
    if (!url) {
      console.warn(`[F1 mscom] No URL match for "${raceName}"`);
      return [];
    }
    return scrapeResultsPage(url);
  } catch (err) {
    console.error("[F1 mscom] scrapeF1RaceResults error:", err);
    return [];
  }
}

export async function isMScomF1RaceFinished(
  season: number,
  raceName: string
): Promise<boolean> {
  try {
    const index = await scrapeF1ResultsIndex(season);
    if (!index.length) return false;
    const url = findF1EventUrl(raceName, index);
    if (!url) return false;

    const html = await fetchPage(`${url}?st=RACE`);
    const $ = cheerio.load(html);

    let finishedRows = 0;
    $("table").first().find("tr").each((_, row) => {
      const firstCell = $(row).find("td").first().text().trim();
      if (/^\d+$/.test(firstCell)) finishedRows++;
    });

    return finishedRows >= 10;
  } catch {
    return false;
  }
}
