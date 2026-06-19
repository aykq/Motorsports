import type { SeriesAdapter } from "@/types/series";
import type { StandingType } from "@/types/series";
import {
  scrapeGT4Schedule,
  scrapeGT4DriverStandings,
  scrapeGT4TeamStandings,
  scrapeGT4DriverList,
} from "./gt4-scraper";
import type { Race, Circuit } from "@/types/series";

// ─── Hardcoded 2026 fallback calendar ────────────────────────────────────────

interface CalendarEntry {
  round: number;
  circuitName: string;
  country: string;
  startDate: string;
  endDate: string;
}

const GT4_CALENDAR_2026: CalendarEntry[] = [
  { round: 1, circuitName: "Circuit Paul Ricard",               country: "France",         startDate: "2026-04-10T09:00:00Z", endDate: "2026-04-12T13:00:00Z" },
  { round: 2, circuitName: "Monza",                             country: "Italy",          startDate: "2026-05-28T09:00:00Z", endDate: "2026-05-31T13:00:00Z" },
  { round: 3, circuitName: "Circuit de Spa-Francorchamps",      country: "Belgium",        startDate: "2026-06-25T09:00:00Z", endDate: "2026-06-27T13:00:00Z" },
  { round: 4, circuitName: "Misano World Circuit",              country: "Italy",          startDate: "2026-07-17T09:00:00Z", endDate: "2026-07-19T13:00:00Z" },
  { round: 5, circuitName: "Circuit Zandvoort",                 country: "Netherlands",    startDate: "2026-09-18T09:00:00Z", endDate: "2026-09-20T13:00:00Z" },
  { round: 6, circuitName: "Autodromo Internacional do Algarve", country: "Portugal",     startDate: "2026-10-16T09:00:00Z", endDate: "2026-10-18T13:00:00Z" },
];

const CIRCUIT_COORDS: Record<string, [number, number]> = {
  "Circuit Paul Ricard":               [43.2506,   5.7916],
  "Monza":                             [45.6156,   9.2811],
  "Circuit de Spa-Francorchamps":      [50.4372,   5.9714],
  "Misano World Circuit":              [43.9626,  12.6976],
  "Circuit Zandvoort":                 [52.3888,   4.5457],
  "Autodromo Internacional do Algarve":[37.2272,  -8.6260],
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function computeStatus(endDate: string): "upcoming" | "live" | "completed" {
  const now  = Date.now();
  const race = new Date(endDate).getTime();
  const twoH = 2 * 60 * 60 * 1000;
  if (race < now - twoH) return "completed";
  if (race <= now + twoH) return "live";
  return "upcoming";
}

function fallbackCalendar(): Race[] {
  return GT4_CALENDAR_2026.map((e) => {
    const qual = new Date(e.startDate);
    qual.setUTCDate(qual.getUTCDate() + 1);
    qual.setUTCHours(9, 0, 0, 0);
    const race1 = new Date(qual);
    race1.setUTCHours(13, 0, 0, 0);

    const coords = CIRCUIT_COORDS[e.circuitName];
    return {
      round:       e.round,
      name:        `GT4 European Series — ${e.circuitName}`,
      circuitId:   slugify(e.circuitName),
      circuitName: e.circuitName,
      location:    e.circuitName,
      country:     e.country,
      date:        e.endDate,
      sessions: [
        { type: "practice1",  date: e.startDate },
        { type: "qualifying", date: qual.toISOString() },
        { type: "sprint",     date: race1.toISOString() },
        { type: "race",       date: e.endDate },
      ],
      status: computeStatus(e.endDate),
      ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
    } as Race;
  });
}

// ─── Public fetch functions ───────────────────────────────────────────────────

async function fetchGT4Schedule(season: number): Promise<Race[]> {
  if (season === new Date().getFullYear()) {
    try {
      const scraped = await scrapeGT4Schedule(season);
      if (scraped.length >= 3) return scraped;
    } catch (err) {
      console.error("[GT4] schedule scraper failed, using fallback:", err);
    }
  }
  if (season === 2026) return fallbackCalendar();
  console.warn(`[GT4] No calendar data for season ${season}`);
  return [];
}

async function fetchGT4Standings(season: number, type: StandingType) {
  if (season !== new Date().getFullYear()) return [];
  try {
    const scraped = type === "driver"
      ? await scrapeGT4DriverStandings()
      : await scrapeGT4TeamStandings();
    if (scraped.length > 0) return scraped;
  } catch (err) {
    console.error("[GT4] standings scraper failed:", err);
  }
  return [];
}

async function fetchGT4Drivers(season: number) {
  if (season !== new Date().getFullYear()) return [];
  try {
    const drivers = await scrapeGT4DriverList();
    if (drivers.length > 0) return drivers;
  } catch (err) {
    console.error("[GT4] driver list scraper failed:", err);
  }
  return [];
}

async function fetchGT4Circuits(season: number): Promise<Circuit[]> {
  const races = await fetchGT4Schedule(season);
  const seen  = new Set<string>();
  const circuits: Circuit[] = [];
  for (const r of races) {
    if (!seen.has(r.circuitId)) {
      seen.add(r.circuitId);
      circuits.push({
        id:       r.circuitId,
        name:     r.circuitName,
        location: r.location,
        country:  r.country,
        lat:      r.circuitLat,
        lng:      r.circuitLng,
      });
    }
  }
  return circuits;
}

export const gt4Adapter: SeriesAdapter = {
  slug: "gt4",
  name: "GT4 European Series",
  fetchSchedule: (season) => fetchGT4Schedule(season),
  fetchStandings: (season, type) => fetchGT4Standings(season, type),
  fetchDrivers: (season) => fetchGT4Drivers(season),
  fetchCircuits: (season) => fetchGT4Circuits(season),
};
