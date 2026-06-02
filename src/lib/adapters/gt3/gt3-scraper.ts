import type { Race, Circuit, RaceSession, RaceStatus, StandingType } from "@/types/series";
import {
  scrapeGTWCESchedule,
  scrapeGTWCEDriverStandings,
  scrapeGTWCETeamStandings,
  scrapeGTWCEDriverList,
} from "./gtwce-scraper";

// ─── Hardcoded 2026 calendar (fallback when scraper fails) ────────────────────

interface CalendarEntry {
  round: number;
  circuitName: string;
  country: string;
  raceDate: string;
  qualifyingDate: string;
  practiceDate: string;
  seriesType: "sprint" | "endurance";
  lat: number;
  lng: number;
}

const GT3_CALENDAR: Record<number, CalendarEntry[]> = {
  2026: [
    { round: 1,  circuitName: "Circuit Paul Ricard",               country: "France",         raceDate: "2026-04-12T13:00:00Z", qualifyingDate: "2026-04-11T09:00:00Z", practiceDate: "2026-04-10T09:00:00Z", seriesType: "sprint",    lat: 43.2506, lng:   5.7916 },
    { round: 2,  circuitName: "Brands Hatch",                      country: "United Kingdom", raceDate: "2026-05-03T13:00:00Z", qualifyingDate: "2026-05-02T13:00:00Z", practiceDate: "2026-05-02T09:00:00Z", seriesType: "sprint",    lat: 51.3578, lng:   0.2634 },
    { round: 3,  circuitName: "Monza",                             country: "Italy",          raceDate: "2026-05-31T13:00:00Z", qualifyingDate: "2026-05-29T10:00:00Z", practiceDate: "2026-05-28T09:00:00Z", seriesType: "endurance", lat: 45.6156, lng:   9.2811 },
    { round: 4,  circuitName: "Circuit de Spa-Francorchamps",      country: "Belgium",        raceDate: "2026-06-28T10:00:00Z", qualifyingDate: "2026-06-25T10:00:00Z", practiceDate: "2026-06-24T09:00:00Z", seriesType: "endurance", lat: 50.4372, lng:   5.9714 },
    { round: 5,  circuitName: "Misano World Circuit",              country: "Italy",          raceDate: "2026-07-19T13:00:00Z", qualifyingDate: "2026-07-18T09:00:00Z", practiceDate: "2026-07-17T09:00:00Z", seriesType: "sprint",    lat: 43.9626, lng:  12.6976 },
    { round: 6,  circuitName: "Circuit de Nevers Magny-Cours",     country: "France",         raceDate: "2026-08-02T13:00:00Z", qualifyingDate: "2026-08-01T09:00:00Z", practiceDate: "2026-07-31T09:00:00Z", seriesType: "sprint",    lat: 46.8642, lng:   3.1636 },
    { round: 7,  circuitName: "Nürburgring",                       country: "Germany",        raceDate: "2026-08-30T13:00:00Z", qualifyingDate: "2026-08-29T09:00:00Z", practiceDate: "2026-08-28T09:00:00Z", seriesType: "endurance", lat: 50.3356, lng:   6.9475 },
    { round: 8,  circuitName: "Circuit Zandvoort",                 country: "Netherlands",    raceDate: "2026-09-20T13:00:00Z", qualifyingDate: "2026-09-19T09:00:00Z", practiceDate: "2026-09-18T09:00:00Z", seriesType: "sprint",    lat: 52.3888, lng:   4.5457 },
    { round: 9,  circuitName: "Circuit de Barcelona-Catalunya",    country: "Spain",          raceDate: "2026-10-04T13:00:00Z", qualifyingDate: "2026-10-03T09:00:00Z", practiceDate: "2026-10-02T09:00:00Z", seriesType: "sprint",    lat: 41.5700, lng:   2.2611 },
    { round: 10, circuitName: "Autodromo Internacional do Algarve", country: "Portugal",      raceDate: "2026-10-18T13:00:00Z", qualifyingDate: "2026-10-17T09:00:00Z", practiceDate: "2026-10-16T09:00:00Z", seriesType: "endurance", lat: 37.2272, lng:  -8.6260 },
  ],
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function computeStatus(raceDate: string): RaceStatus {
  const now  = Date.now();
  const race = new Date(raceDate).getTime();
  const two  = 2 * 60 * 60 * 1000;
  if (race < now - two) return "completed";
  if (race <= now + two) return "live";
  return "upcoming";
}

function buildSprintSessions(e: CalendarEntry): RaceSession[] {
  const race1 = new Date(e.qualifyingDate);
  race1.setUTCHours(13, 0, 0, 0);
  return [
    { type: "practice1",  date: e.practiceDate },
    { type: "qualifying", date: e.qualifyingDate },
    { type: "sprint",     date: race1.toISOString() },
    { type: "race",       date: e.raceDate },
  ];
}

function buildEnduranceSessions(e: CalendarEntry): RaceSession[] {
  const p2 = new Date(e.practiceDate);
  p2.setDate(p2.getDate() + 1);
  return [
    { type: "practice1",  date: e.practiceDate },
    { type: "practice2",  date: p2.toISOString() },
    { type: "qualifying", date: e.qualifyingDate },
    { type: "race",       date: e.raceDate },
  ];
}

function calendarToRaces(entries: CalendarEntry[]): Race[] {
  return entries.map((e) => ({
    round:       e.round,
    name:        `GT World Challenge Europe ${e.seriesType === "endurance" ? "Endurance" : "Sprint"} Cup — ${e.circuitName}`,
    circuitId:   slugify(e.circuitName),
    circuitName: e.circuitName,
    location:    e.circuitName,
    country:     e.country,
    date:        e.raceDate,
    sessions:    e.seriesType === "sprint" ? buildSprintSessions(e) : buildEnduranceSessions(e),
    status:      computeStatus(e.raceDate),
    circuitLat:  e.lat,
    circuitLng:  e.lng,
  }));
}

// ─── Public Fetch Functions ───────────────────────────────────────────────────

export async function fetchGT3Schedule(season: number): Promise<Race[]> {
  if (season === new Date().getFullYear()) {
    try {
      const scraped = await scrapeGTWCESchedule(season);
      if (scraped.length >= 5) return scraped;
    } catch (err) {
      console.error("[GT3] schedule scraper failed, using fallback:", err);
    }
  }
  const hardcoded = GT3_CALENDAR[season];
  if (hardcoded) return calendarToRaces(hardcoded);
  console.warn(`[GT3] No calendar data for season ${season}`);
  return [];
}

export async function fetchGT3Standings(season: number, type: StandingType) {
  if (season === new Date().getFullYear()) {
    try {
      const scraped = type === "driver"
        ? await scrapeGTWCEDriverStandings()
        : await scrapeGTWCETeamStandings();
      if (scraped.length > 0) return scraped;
    } catch (err) {
      console.error("[GT3] standings scraper failed:", err);
    }
  }
  return [];
}

export async function fetchGT3Drivers(season: number) {
  if (season !== new Date().getFullYear()) return [];
  try {
    const drivers = await scrapeGTWCEDriverList();
    if (drivers.length > 0) return drivers;
  } catch (err) {
    console.error("[GT3] driver list scraper failed:", err);
  }
  return [];
}

export async function fetchGT3Circuits(season: number): Promise<Circuit[]> {
  const races = await fetchGT3Schedule(season);
  const seen  = new Set<string>();
  const circuits: Circuit[] = [];
  for (const r of races) {
    if (!seen.has(r.circuitId)) {
      seen.add(r.circuitId);
      circuits.push({ id: r.circuitId, name: r.circuitName, location: r.location, country: r.country, lat: r.circuitLat, lng: r.circuitLng });
    }
  }
  return circuits;
}
