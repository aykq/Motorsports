import * as cheerio from "cheerio";
import { z } from "zod";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";

const NextDataEventSchema = z.object({
  date: z.string().optional(),
  circuit: z.string().optional(),
  location: z.string().optional(),
  name: z.string().optional(),
  country: z.string().optional(),
  finished: z.boolean().optional(),
  status: z.string().optional(),
});
type NextDataEvent = z.infer<typeof NextDataEventSchema>;

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
  qualifyingDate: string;
  practiceDate: string;
  lat: number;
  lng: number;
}

const CARRERA_CUP_DE_CALENDAR: Record<number, CalendarEntry[]> = {
  2026: [
    { round: 1, circuitName: "Imola",                        country: "Italy",        raceDate: "2026-04-19T10:00:00Z", qualifyingDate: "2026-04-18T09:00:00Z", practiceDate: "2026-04-17T10:00:00Z", lat: 44.3439, lng:  11.7167 },
    { round: 2, circuitName: "Red Bull Ring",                country: "Austria",      raceDate: "2026-04-26T10:00:00Z", qualifyingDate: "2026-04-25T09:00:00Z", practiceDate: "2026-04-24T10:00:00Z", lat: 47.2197, lng:  14.7647 },
    { round: 3, circuitName: "Circuit de Spa-Francorchamps", country: "Belgium",      raceDate: "2026-05-17T10:00:00Z", qualifyingDate: "2026-05-16T09:00:00Z", practiceDate: "2026-05-15T10:00:00Z", lat: 50.4372, lng:   5.9714 },
    { round: 4, circuitName: "Circuit Zandvoort",            country: "Netherlands",  raceDate: "2026-05-24T10:00:00Z", qualifyingDate: "2026-05-23T09:00:00Z", practiceDate: "2026-05-22T10:00:00Z", lat: 52.3888, lng:   4.5457 },
    { round: 5, circuitName: "Dekra Lausitzring",            country: "Germany",      raceDate: "2026-06-21T10:00:00Z", qualifyingDate: "2026-06-20T09:00:00Z", practiceDate: "2026-06-19T10:00:00Z", lat: 51.5317, lng:  14.1220 },
    { round: 6, circuitName: "Norisring",                    country: "Germany",      raceDate: "2026-07-05T10:00:00Z", qualifyingDate: "2026-07-04T09:00:00Z", practiceDate: "2026-07-03T10:00:00Z", lat: 49.4572, lng:  11.0796 },
    { round: 7, circuitName: "Nürburgring",                  country: "Germany",      raceDate: "2026-08-16T10:00:00Z", qualifyingDate: "2026-08-15T09:00:00Z", practiceDate: "2026-08-14T10:00:00Z", lat: 50.3356, lng:   6.9475 },
    { round: 8, circuitName: "Hockenheimring",               country: "Germany",      raceDate: "2026-10-11T10:00:00Z", qualifyingDate: "2026-10-10T09:00:00Z", practiceDate: "2026-10-09T10:00:00Z", lat: 49.3278, lng:   8.5656 },
  ],
};

function computeStatus(dateStr: string): RaceStatus {
  const raceTs = new Date(dateStr).getTime();
  const now = Date.now();
  if (raceTs > now) return "upcoming";
  if (raceTs > now - 3 * 60 * 60 * 1000) return "live";
  return "completed";
}

function isCssGarbage(name: string): boolean {
  return /\{[^}]*:/.test(name) || /^\.css-/.test(name) || name.length > 200;
}

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
      { type: "qualifying" as const, date: e.qualifyingDate },
      { type: "race" as const, date: e.raceDate },
    ],
    status: computeStatus(e.raceDate),
    circuitLat: e.lat,
    circuitLng: e.lng,
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
        const parsed: NextDataEvent[] = events
          .map((ev: unknown) => NextDataEventSchema.safeParse(ev))
          .filter((r): r is { success: true; data: NextDataEvent } => r.success)
          .map((r) => r.data);

        return parsed
          .filter((ev) => {
            const year = new Date(String(ev.date ?? "")).getFullYear();
            return year === season;
          })
          .map((ev, i) => {
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
    const valid = scraped.filter((r) => !isCssGarbage(r.name));
    if (valid.length > 0) return valid;
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

// ─── Driver scraper ───────────────────────────────────────────────────────────

const RACING_BASE = "https://racing.porsche.com";

async function scrapeTeamSlugs(): Promise<string[]> {
  const html = await fetchCarreraPage(`${RACING_BASE}/series/carrera-cup-deutschland`);
  const $ = cheerio.load(html);
  const slugs = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/teams\/(pccd-[^/?#]+)/);
    if (m) slugs.add(m[1]);
  });
  return Array.from(slugs);
}

interface TeamInfo { slug: string; name: string; driverSlugs: string[] }

async function scrapeTeam(teamSlug: string): Promise<TeamInfo> {
  const html = await fetchCarreraPage(`${RACING_BASE}/teams/${teamSlug}`);
  const $ = cheerio.load(html);
  const name = $("h1").first().text().trim() || teamSlug;
  const driverSlugs = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/drivers\/(pccd-[^/?#]+)/);
    if (m) driverSlugs.add(m[1]);
  });
  return { slug: teamSlug, name, driverSlugs: Array.from(driverSlugs) };
}

async function scrapeDriverProfile(driverSlug: string, team: TeamInfo): Promise<Driver | null> {
  try {
    const html = await fetchCarreraPage(`${RACING_BASE}/drivers/${driverSlug}`);
    const $ = cheerio.load(html);

    // Cloudinary image
    let image: string | undefined;
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? "";
      if (!image && src.includes("res.cloudinary.com")) image = src;
    });

    // Number from image URL: /v1/57_FirstName_...
    let number: number | undefined;
    if (image) {
      const m = image.match(/\/v\d+\/(\d+)_/);
      if (m) number = parseInt(m[1], 10);
    }

    // Name from h1
    const fullName = $("h1").first().text().trim();
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

    // Nationality from dt/dd or labeled elements
    let nationality = "";
    $("dt, th").each((_, el) => {
      const label = $(el).text().trim().toLowerCase();
      if ((label === "nationality" || label === "country" || label === "nation") && !nationality) {
        const val = $(el).next().text().trim();
        if (val && val.length < 60) nationality = val;
      }
    });

    return {
      id: driverSlug,
      firstName,
      lastName,
      nationality,
      team: team.name,
      teamId: team.slug,
      number: number || undefined,
      image,
    };
  } catch (err) {
    console.warn(`[CarreraCup] driver scrape failed: ${driverSlug}`, err);
    return null;
  }
}

export async function fetchCarreraDrivers(_season: number): Promise<Driver[]> {
  try {
    const teamSlugs = await scrapeTeamSlugs();
    if (teamSlugs.length === 0) return [];

    const teams = await Promise.all(teamSlugs.map(scrapeTeam));

    // Collect unique driver slugs with their team info
    const tasks: { driverSlug: string; team: TeamInfo }[] = [];
    const seen = new Set<string>();
    for (const team of teams) {
      for (const driverSlug of team.driverSlugs) {
        if (!seen.has(driverSlug)) {
          seen.add(driverSlug);
          tasks.push({ driverSlug, team });
        }
      }
    }

    const results = await Promise.all(
      tasks.map(({ driverSlug, team }) => scrapeDriverProfile(driverSlug, team))
    );
    return results.filter((d): d is Driver => d !== null);
  } catch (err) {
    console.error("[CarreraCup] fetchCarreraDrivers error:", err);
    return [];
  }
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
