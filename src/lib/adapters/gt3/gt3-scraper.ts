import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";

// ─── Hardcoded calendars (fallback — HTML site is JS-rendered) ────────────────

interface CalendarEntry {
  round: number;
  circuitName: string;
  country: string;
  raceDate: string;
  practiceDate: string;
  status: RaceStatus;
  seriesType: "sprint" | "endurance";
}

const GT3_CALENDAR: Record<number, CalendarEntry[]> = {
  2026: [
    { round: 1, circuitName: "Circuit Paul Ricard", country: "France", raceDate: "2026-04-12T13:00:00Z", practiceDate: "2026-04-10T09:00:00Z", status: "completed", seriesType: "sprint" },
    { round: 2, circuitName: "Brands Hatch", country: "United Kingdom", raceDate: "2026-05-03T13:00:00Z", practiceDate: "2026-05-02T09:00:00Z", status: "completed", seriesType: "sprint" },
    { round: 3, circuitName: "Monza", country: "Italy", raceDate: "2026-05-31T13:00:00Z", practiceDate: "2026-05-28T09:00:00Z", status: "upcoming", seriesType: "endurance" },
    { round: 4, circuitName: "Circuit de Spa-Francorchamps", country: "Belgium", raceDate: "2026-06-28T10:00:00Z", practiceDate: "2026-06-24T09:00:00Z", status: "upcoming", seriesType: "endurance" },
    { round: 5, circuitName: "Misano World Circuit", country: "Italy", raceDate: "2026-07-19T13:00:00Z", practiceDate: "2026-07-17T09:00:00Z", status: "upcoming", seriesType: "sprint" },
    { round: 6, circuitName: "Circuit de Nevers Magny-Cours", country: "France", raceDate: "2026-08-02T13:00:00Z", practiceDate: "2026-07-31T09:00:00Z", status: "upcoming", seriesType: "sprint" },
    { round: 7, circuitName: "Nürburgring", country: "Germany", raceDate: "2026-08-30T13:00:00Z", practiceDate: "2026-08-28T09:00:00Z", status: "upcoming", seriesType: "endurance" },
    { round: 8, circuitName: "Circuit Zandvoort", country: "Netherlands", raceDate: "2026-09-20T13:00:00Z", practiceDate: "2026-09-18T09:00:00Z", status: "upcoming", seriesType: "sprint" },
    { round: 9, circuitName: "Circuit de Barcelona-Catalunya", country: "Spain", raceDate: "2026-10-04T13:00:00Z", practiceDate: "2026-10-02T09:00:00Z", status: "upcoming", seriesType: "sprint" },
    { round: 10, circuitName: "Autodromo Internacional do Algarve", country: "Portugal", raceDate: "2026-10-18T13:00:00Z", practiceDate: "2026-10-16T09:00:00Z", status: "upcoming", seriesType: "endurance" },
  ],
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function calendarToRaces(entries: CalendarEntry[]): Race[] {
  return entries.map((e) => ({
    round: e.round,
    name: `GT World Challenge${e.seriesType === "endurance" ? " Endurance" : ""} - ${e.circuitName}`,
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

// ─── Public Fetch Functions ───────────────────────────────────────────────────

export async function fetchGT3Schedule(season: number): Promise<Race[]> {
  const hardcoded = GT3_CALENDAR[season];
  if (hardcoded) return calendarToRaces(hardcoded);
  console.warn(`[GT3] No calendar data for season ${season}`);
  return [];
}

export async function fetchGT3Standings(
  _season: number,
  _type: StandingType
): Promise<Standing[]> {
  return [];
}

export async function fetchGT3Drivers(_season: number): Promise<Driver[]> {
  return [];
}

export async function fetchGT3Circuits(season: number): Promise<Circuit[]> {
  const races = await fetchGT3Schedule(season);
  const seen = new Set<string>();
  const circuits: Circuit[] = [];
  for (const r of races) {
    if (!seen.has(r.circuitId)) {
      seen.add(r.circuitId);
      circuits.push({ id: r.circuitId, name: r.circuitName, location: r.location, country: r.country });
    }
  }
  return circuits;
}
