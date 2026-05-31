import * as cheerio from "cheerio";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";

const TIMEOUT_MS = 15_000;

async function fetchCarreraPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "motorsports-hub/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Carrera Cup site ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Hardcoded 2026 calendar (fallback) ──────────────────────────────────────

interface CalendarEntry {
  round: number;
  circuitName: string;
  country: string;
  raceDate: string;
  practiceDate: string;
  status: RaceStatus;
}

const CARRERA_CUP_DE_CALENDAR: Record<number, CalendarEntry[]> = {
  2026: [
    {
      round: 1,
      circuitName: "Imola",
      country: "Italy",
      raceDate: "2026-04-19T10:00:00Z",
      practiceDate: "2026-04-17T10:00:00Z",
      status: "completed",
    },
    {
      round: 2,
      circuitName: "Red Bull Ring",
      country: "Austria",
      raceDate: "2026-04-26T10:00:00Z",
      practiceDate: "2026-04-24T10:00:00Z",
      status: "completed",
    },
    {
      round: 3,
      circuitName: "Circuit de Spa-Francorchamps",
      country: "Belgium",
      raceDate: "2026-05-17T10:00:00Z",
      practiceDate: "2026-05-15T10:00:00Z",
      status: "upcoming",
    },
    {
      round: 4,
      circuitName: "Circuit Zandvoort",
      country: "Netherlands",
      raceDate: "2026-05-24T10:00:00Z",
      practiceDate: "2026-05-22T10:00:00Z",
      status: "upcoming",
    },
    {
      round: 5,
      circuitName: "Dekra Lausitzring",
      country: "Germany",
      raceDate: "2026-06-21T10:00:00Z",
      practiceDate: "2026-06-19T10:00:00Z",
      status: "upcoming",
    },
    {
      round: 6,
      circuitName: "Norisring",
      country: "Germany",
      raceDate: "2026-07-05T10:00:00Z",
      practiceDate: "2026-07-03T10:00:00Z",
      status: "upcoming",
    },
    {
      round: 7,
      circuitName: "Nürburgring",
      country: "Germany",
      raceDate: "2026-08-16T10:00:00Z",
      practiceDate: "2026-08-14T10:00:00Z",
      status: "upcoming",
    },
    {
      round: 8,
      circuitName: "Hockenheimring",
      country: "Germany",
      raceDate: "2026-10-11T10:00:00Z",
      practiceDate: "2026-10-09T10:00:00Z",
      status: "upcoming",
    },
  ],
};

function calendarToRaces(entries: CalendarEntry[]): Race[] {
  return entries.map((e) => ({
    round: e.round,
    name: `Carrera Cup Deutschland - ${e.circuitName}`,
    circuitId: slugify(e.circuitName),
    circuitName: e.circuitName,
    location: e.circuitName,
    country: e.country,
    date: e.raceDate,
    sessions: [
      { type: "practice1" as const, date: e.practiceDate },
      { type: "race" as const, date: e.raceDate },
    ],
    status: e.status,
  }));
}

// ─── Scraper (racing.porsche.com) ────────────────────────────────────────────

async function scrapeCarreraSchedule(season: number): Promise<Race[]> {
  const url = `https://racing.porsche.com/carrera-cup-deutschland/ergebnisse`;
  const html = await fetchCarreraPage(url);
  const $ = cheerio.load(html);

  // Try to find embedded JSON (__NEXT_DATA__ or similar)
  const nextData = $("script#__NEXT_DATA__").text();
  if (nextData) {
    try {
      const data = JSON.parse(nextData);
      const events =
        data?.props?.pageProps?.events ??
        data?.props?.pageProps?.calendar ??
        data?.props?.pageProps?.races;
      if (Array.isArray(events) && events.length > 0) {
        return events
          .filter((ev: Record<string, unknown>) => {
            const year = new Date(String(ev.date ?? "")).getFullYear();
            return year === season;
          })
          .map((ev: Record<string, unknown>, i: number) => {
            const dateStr = String(ev.date ?? `${season}-01-01`);
            const name = String(ev.circuit ?? ev.location ?? ev.name ?? "Race");
            const status: RaceStatus =
              ev.finished || ev.status === "completed" ? "completed" : "upcoming";
            return {
              round: i + 1,
              name: `Carrera Cup Deutschland - ${name}`,
              circuitId: slugify(name),
              circuitName: name,
              location: name,
              country: String(ev.country ?? "Germany"),
              date: `${dateStr}T10:00:00Z`,
              sessions: [{ type: "race" as const, date: `${dateStr}T10:00:00Z` }],
              status,
            };
          });
      }
    } catch {
      // fall through
    }
  }

  // HTML table / list fallback
  const events: Race[] = [];
  $("[class*='race'], [class*='event'], [class*='round'], article, .result-item").each(
    (i, el) => {
      const text = $(el).text().trim();
      if (text.length < 3) return;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const name = lines[0];
      const dateText = lines.find((l) => /\d{2}\.\d{2}\.\d{4}/.test(l)) ?? "";
      let dateStr = `${season}-01-01`;
      if (dateText) {
        const [d, m, y] = dateText.match(/\d{2}/g) ?? [];
        if (d && m && y) dateStr = `20${y}-${m}-${d}`;
      }
      events.push({
        round: i + 1,
        name: `Carrera Cup Deutschland - ${name}`,
        circuitId: slugify(name),
        circuitName: name,
        location: name,
        country: "Germany",
        date: `${dateStr}T10:00:00Z`,
        sessions: [{ type: "race" as const, date: `${dateStr}T10:00:00Z` }],
        status: "upcoming",
      });
    }
  );

  return events;
}

// ─── Public Fetch Functions ───────────────────────────────────────────────────

export async function fetchCarreraSchedule(season: number): Promise<Race[]> {
  // Try live scraping first; fall back to hardcoded calendar
  try {
    const scraped = await scrapeCarreraSchedule(season);
    if (scraped.length > 0) return scraped;
  } catch (err) {
    console.error("[CarreraCup] scraper error:", err);
  }

  // Hardcoded fallback
  const hardcoded = CARRERA_CUP_DE_CALENDAR[season];
  if (hardcoded) {
    console.warn(`[CarreraCup] Using hardcoded ${season} calendar`);
    return calendarToRaces(hardcoded);
  }

  console.error(`[CarreraCup] No data for season ${season}`);
  return [];
}

export async function fetchCarreraStandings(
  _season: number,
  _type: StandingType
): Promise<Standing[]> {
  return [];
}

export async function fetchCarreraDrivers(_season: number): Promise<Driver[]> {
  return [];
}

export async function fetchCarreraCircuits(season: number): Promise<Circuit[]> {
  const races = await fetchCarreraSchedule(season);
  const seen = new Set<string>();
  const circuits: Circuit[] = [];
  for (const r of races) {
    if (!seen.has(r.circuitId)) {
      seen.add(r.circuitId);
      circuits.push({
        id: r.circuitId,
        name: r.circuitName,
        location: r.location,
        country: r.country,
      });
    }
  }
  return circuits;
}
