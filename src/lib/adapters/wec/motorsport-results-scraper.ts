import * as cheerio from "cheerio";
import type { RaceResult } from "@/types/series";

const BASE = "https://tr.motorsport.com";
const TIMEOUT_MS = 15_000;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; motorsports-hub/1.0)",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Index Scraping ───────────────────────────────────────────────────────────

interface RaceResultLink {
  slug: string;
  url: string;
}

async function scrapeResultsIndex(season: number): Promise<RaceResultLink[]> {
  const html = await fetchPage(`${BASE}/wec/results/${season}/`);
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: RaceResultLink[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/wec\/results\/\d+\/([^/?#]+)\//);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      links.push({ slug: m[1], url: `${BASE}/wec/results/${season}/${m[1]}/` });
    }
  });

  return links;
}

// ─── Race Matching ────────────────────────────────────────────────────────────

// Extract searchable keywords from race/circuit name
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["hours", "saat", "the", "and", "von"].includes(w));
}

function findRaceUrl(
  raceName: string,
  circuitName: string,
  links: RaceResultLink[]
): string | null {
  const keywords = [
    ...extractKeywords(raceName),
    ...extractKeywords(circuitName),
  ];

  for (const link of links) {
    const slugWords = link.slug.toLowerCase().replace(/-/g, " ");
    if (keywords.some((k) => slugWords.includes(k))) {
      return link.url;
    }
  }
  return null;
}

// ─── Results Scraping ─────────────────────────────────────────────────────────

interface RawWECResult {
  position: number;
  carNumber: string;
  carClass: string;
  team: string;
  drivers: string[];
  carModel: string;
  laps: number;
  time: string;
  gap: string | null;
  pits: number;
  points: number;
  dnf: boolean;
}

function cleanDriverName(raw: string): string {
  return raw.replace(/\([A-Z]{2,3}\)/g, "").replace(/\s+/g, " ").trim();
}

async function scrapeRaceResultsPage(url: string): Promise<RawWECResult[]> {
  const html = await fetchPage(`${url}?st=RACE`);
  const $ = cheerio.load(html);

  function parseDriverCell(cellHtml: string): string[] {
    const $cell = cheerio.load(cellHtml);
    const drivers: string[] = [];
    const seen = new Set<string>();

    $cell("span, a").each((_, el) => {
      const text = cleanDriverName($cell(el).text());
      if (text.length > 2 && text.length < 60 && /[A-Z][a-z]/.test(text) && !seen.has(text)) {
        seen.add(text);
        drivers.push(text);
      }
    });

    if (drivers.length > 0) return drivers;

    // Fallback: regex on raw text — "M. Conway K. Kobayashi" pattern
    const text = cleanDriverName($cell.text());
    const pattern = /[A-Z][a-z]?\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (!seen.has(match[0])) { seen.add(match[0]); drivers.push(match[0]); }
    }

    return drivers;
  }
  const results: RawWECResult[] = [];
  let currentClass = "";
  let leaderLaps = 0;

  $("table").first().find("tr").each((_, row) => {
    const $row = $(row);
    const cells = $row.find("td");

    // Class header detection (row with no td cells or class-name text)
    if (!cells.length) {
      const text = $row.text().trim().toUpperCase();
      if (/HYPERCAR|LMGT3|LMP2/.test(text)) {
        const m = text.match(/HYPERCAR|LMGT3|LMP2/);
        if (m) currentClass = m[0];
      }
      return;
    }

    // Check if any td contains a class name (some tables inline the class)
    cells.each((_, cell) => {
      const text = $(cell).text().trim().toUpperCase();
      if (/^(HYPERCAR|LMGT3|LMP2)$/.test(text)) {
        currentClass = text;
      }
    });

    // Position must be in first cell
    const posText = $(cells[0]).text().trim();
    const pos = parseInt(posText);
    if (isNaN(pos) || pos < 1 || pos > 200) return;

    // Flexible column parsing based on cell count
    const len = cells.length;
    if (len < 6) return;

    const team = $(cells[1]).text().trim().replace(/\s+/g, " ");
    const carNumber = $(cells[2]).text().trim().replace(/\D/g, "") || $(cells[2]).text().trim();
    const drivers = parseDriverCell($.html(cells[3]) ?? "");
    const carModel = $(cells[4]).text().trim().replace(/\s+/g, " ");
    const laps = parseInt($(cells[5]).text().trim()) || 0;

    if (pos === 1) leaderLaps = laps;

    const time = len > 6 ? $(cells[6]).text().trim() : "";
    const gapRaw = len > 7 ? $(cells[7]).text().trim() : "";
    const gap = gapRaw && gapRaw !== "0" && gapRaw !== posText ? gapRaw : null;
    const pits = len > 8 ? parseInt($(cells[8]).text().trim()) || 0 : 0;

    // Points: last cell or second-to-last (some tables have a DNF column before points)
    const lastCellText = $(cells[len - 1]).text().trim();
    const points = parseFloat(lastCellText) || 0;

    const dnf = leaderLaps > 0 && laps < leaderLaps - 5 && pos > 1;

    results.push({
      position: pos,
      carNumber,
      carClass: currentClass,
      team,
      drivers,
      carModel,
      laps,
      time,
      gap,
      pits,
      points,
      dnf,
    });
  });

  return results;
}

// ─── Convert to RaceResult ────────────────────────────────────────────────────

function toRaceResult(r: RawWECResult): RaceResult {
  const [primary, ...rest] = r.drivers;
  return {
    position: r.position,
    driverId: `wec-car-${r.carNumber}`,
    driverName: primary ?? r.team,
    driverNumber: parseInt(r.carNumber) || undefined,
    team: r.team,
    time: r.position === 1 ? r.time : undefined,
    gap: r.gap ?? undefined,
    points: r.points,
    status: r.dnf ? "DNF" : "Finished",
    laps: r.laps,
    coDrivers: rest.length > 0 ? rest : undefined,
    carClass: r.carClass || undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchWECRaceResults(
  season: number,
  raceName: string,
  circuitName: string
): Promise<RaceResult[]> {
  try {
    const index = await scrapeResultsIndex(season);
    if (!index.length) return [];

    const url = findRaceUrl(raceName, circuitName, index);
    if (!url) {
      console.warn(`[WEC scraper] No URL match for "${raceName}" / "${circuitName}"`);
      return [];
    }

    const raw = await scrapeRaceResultsPage(url);
    return raw.map(toRaceResult);
  } catch (err) {
    console.error("[WEC scraper] fetchWECRaceResults error:", err);
    return [];
  }
}
