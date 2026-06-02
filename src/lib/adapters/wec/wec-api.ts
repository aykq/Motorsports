import { z } from "zod";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";
import { lookupCircuitCoords } from "@/lib/circuit-coords";
import { getWECDrivers } from "./wec-drivers";

const THESPORTSDB_WEC_ID = "4413";
const TIMEOUT_MS = 15_000;

async function fetchSportsDB(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3${path}`, {
      signal: controller.signal,
      headers: { "User-Agent": "motorsports-hub/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`TheSportsDB ${res.status}: ${path}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const SportsDBEventSchema = z.object({
  idEvent: z.string(),
  strEvent: z.string(),
  intRound: z.union([z.string(), z.number()]).nullable().optional(),
  dateEvent: z.string().nullable().optional(),
  strTime: z.string().nullable().optional(),
  strTimestamp: z.string().nullable().optional(),
  strVenue: z.string().nullable().optional(),
  strCountry: z.string().nullable().optional(),
  strStatus: z.string().nullable().optional(),
  strFilename: z.string().nullable().optional(),
});

const EventsResponseSchema = z.object({
  events: z.array(SportsDBEventSchema).nullable(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStatus(strStatus?: string | null): RaceStatus {
  if (!strStatus) return "upcoming";
  const s = strStatus.toUpperCase();
  if (s === "FT" || s === "AP" || s === "AET") return "completed";
  if (s === "LIVE" || s === "HT" || s === "ET") return "live";
  return "upcoming";
}

function extractSessionType(strEvent: string): "race" | "qualifying" | "practice1" | "practice2" {
  const lower = strEvent.toLowerCase();
  if (lower.includes("qualify")) return "qualifying";
  if (lower.includes("practice 2") || lower.includes("practice2")) return "practice2";
  if (lower.includes("practice")) return "practice1";
  return "race";
}

function slugifyVenue(venue: string): string {
  return venue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMidnightUtc(ts: string): boolean {
  return ts.endsWith("T00:00:00Z") || ts.endsWith("T00:00:00.000Z");
}

function buildRaceDate(
  dateEvent?: string | null,
  strTime?: string | null,
  strTimestamp?: string | null
): string {
  if (strTimestamp) {
    const ts = strTimestamp.endsWith("Z") ? strTimestamp : `${strTimestamp}Z`;
    if (!isMidnightUtc(ts)) return ts;
    // Midnight UTC = TheSportsDB placeholder, gerçek saat bilinmiyor
  }
  if (!dateEvent) return new Date().toISOString();
  if (strTime && strTime !== "00:00:00") {
    const t = strTime.endsWith("Z") ? strTime : `${strTime}Z`;
    return `${dateEvent}T${t}`;
  }
  return `${dateEvent}T12:00:00Z`;
}

function extractMainRaceName(events: z.infer<typeof SportsDBEventSchema>[]): string {
  const race = events.find(
    (e) => !e.strEvent.toLowerCase().includes("practice") && !e.strEvent.toLowerCase().includes("quali")
  );
  return (race ?? events[0]).strEvent
    .replace(/\s*-\s*(race|race \d+)$/i, "")
    .trim();
}

// ─── Static calendar fallback (used when TheSportsDB is incomplete) ───────────

const WEC_STATIC_CALENDARS: Record<number, Array<{
  round: number; name: string; circuitName: string; location: string; country: string;
  date: string; qualifyingDate: string; practiceDate: string;
}>> = {
  2026: [
    { round: 1, name: "6 Hours of Imola",             circuitName: "Imola Circuit",                  location: "Imola",           country: "Italy",          date: "2026-04-19T09:00:00Z", qualifyingDate: "2026-04-18T11:00:00Z", practiceDate: "2026-04-18T07:00:00Z" },
    { round: 2, name: "6 Hours of Spa-Francorchamps", circuitName: "Circuit de Spa-Francorchamps",   location: "Spa-Francorchamps", country: "Belgium",        date: "2026-05-09T09:00:00Z", qualifyingDate: "2026-05-08T11:00:00Z", practiceDate: "2026-05-08T07:00:00Z" },
    { round: 3, name: "24 Hours of Le Mans",           circuitName: "Circuit de la Sarthe",           location: "Le Mans",         country: "France",         date: "2026-06-13T14:00:00Z", qualifyingDate: "2026-06-11T17:00:00Z", practiceDate: "2026-06-10T08:00:00Z" },
    { round: 4, name: "6 Hours of São Paulo",          circuitName: "Interlagos Circuit",             location: "São Paulo",       country: "Brazil",         date: "2026-07-12T13:00:00Z", qualifyingDate: "2026-07-11T14:00:00Z", practiceDate: "2026-07-11T10:00:00Z" },
    { round: 5, name: "Lone Star Le Mans",             circuitName: "Circuit of the Americas",        location: "Austin",          country: "United States",  date: "2026-09-06T17:00:00Z", qualifyingDate: "2026-09-05T17:30:00Z", practiceDate: "2026-09-05T14:00:00Z" },
    { round: 6, name: "6 Hours of Fuji",               circuitName: "Fuji Speedway",                  location: "Oyama",           country: "Japan",          date: "2026-09-27T02:00:00Z", qualifyingDate: "2026-09-26T06:00:00Z", practiceDate: "2026-09-26T02:00:00Z" },
    { round: 7, name: "Qatar 1812 km",                 circuitName: "Lusail International Circuit",   location: "Lusail",          country: "Qatar",          date: "2026-10-24T13:00:00Z", qualifyingDate: "2026-10-23T13:30:00Z", practiceDate: "2026-10-23T10:00:00Z" },
    { round: 8, name: "8 Hours of Bahrain",            circuitName: "Bahrain International Circuit",  location: "Sakhir",          country: "Bahrain",        date: "2026-11-07T13:00:00Z", qualifyingDate: "2026-11-06T13:30:00Z", practiceDate: "2026-11-06T10:00:00Z" },
  ],
};

function buildStaticSchedule(season: number): Race[] {
  const calendar = WEC_STATIC_CALENDARS[season];
  if (!calendar) return [];
  const now = Date.now();
  return calendar.map((r) => {
    const raceMs = new Date(r.date).getTime();
    const status: RaceStatus = raceMs > now ? "upcoming" : raceMs > now - 28 * 3_600_000 ? "live" : "completed";
    const coords = lookupCircuitCoords(r.circuitName);
    return {
      round: r.round,
      name: r.name,
      circuitId: r.circuitName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      circuitName: r.circuitName,
      location: r.location,
      country: r.country,
      date: r.date,
      sessions: [
        { type: "practice1" as const, date: r.practiceDate },
        { type: "qualifying" as const, date: r.qualifyingDate },
        { type: "race" as const, date: r.date },
      ],
      status,
      ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
    };
  });
}

// ─── Fetch Functions ──────────────────────────────────────────────────────────

export async function fetchWECSchedule(season: number): Promise<Race[]> {
  // Statik takvim varsa önce onu kur; TheSportsDB sadece status güncellemesi için kullanılır
  const staticRaces = buildStaticSchedule(season);

  try {
    const raw = await fetchSportsDB(
      `/eventsseason.php?id=${THESPORTSDB_WEC_ID}&s=${season}`
    );
    const parsed = EventsResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.events) return staticRaces.length > 0 ? staticRaces : [];

    const events = parsed.data.events;

    // Group by round — intRound can be number or string
    const roundMap = new Map<number, typeof events>();
    for (const ev of events) {
      const raw = ev.intRound;
      const round = raw != null ? (typeof raw === "number" ? raw : parseInt(raw, 10)) || 1 : 1;
      if (!roundMap.has(round)) roundMap.set(round, []);
      roundMap.get(round)!.push(ev);
    }

    // TheSportsDB'den gelen status bilgisini çıkar (tarih → status)
    const statusByDate = new Map<string, RaceStatus>();
    for (const [, roundEvents] of roundMap) {
      const primary = roundEvents.find(
        (e) =>
          !e.strEvent.toLowerCase().includes("practice") &&
          !e.strEvent.toLowerCase().includes("quali")
      ) ?? roundEvents[roundEvents.length - 1];
      const raceDate = buildRaceDate(primary.dateEvent, primary.strTime, primary.strTimestamp);
      statusByDate.set(raceDate.slice(0, 10), mapStatus(primary.strStatus));
    }

    // Statik takvim varsa TheSportsDB status'uyla güncelle
    if (staticRaces.length > 0) {
      return staticRaces.map((r) => {
        const dateKey = r.date.slice(0, 10);
        const liveStatus = statusByDate.get(dateKey);
        return liveStatus ? { ...r, status: liveStatus } : r;
      });
    }

    // Statik takvim yok — TheSportsDB verisini doğrudan kullan
    const races: Race[] = [];
    for (const [round, roundEvents] of roundMap) {
      const primary = roundEvents.find(
        (e) =>
          !e.strEvent.toLowerCase().includes("practice") &&
          !e.strEvent.toLowerCase().includes("quali")
      ) ?? roundEvents[roundEvents.length - 1];

      const venue = primary.strVenue ?? "Unknown Circuit";
      const country = primary.strCountry ?? "";
      const raceDate = buildRaceDate(primary.dateEvent, primary.strTime, primary.strTimestamp);
      const status = mapStatus(primary.strStatus);

      const sessions = roundEvents.map((e) => ({
        type: extractSessionType(e.strEvent),
        date: buildRaceDate(e.dateEvent, e.strTime, e.strTimestamp),
      }));

      const coords = lookupCircuitCoords(venue);
      races.push({
        round,
        name: extractMainRaceName(roundEvents),
        circuitId: slugifyVenue(venue),
        circuitName: venue,
        location: venue,
        country,
        date: raceDate,
        sessions: sessions.length > 0 ? sessions : [{ type: "race", date: raceDate }],
        status,
        ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
      });
    }

    races.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    races.forEach((r, i) => { r.round = i + 1; });
    return races;
  } catch (err) {
    console.error("[WEC] fetchSchedule error:", err);
    return staticRaces.length > 0 ? staticRaces : [];
  }
}

// WEC standings are not available in TheSportsDB free tier — returns empty
export async function fetchWECStandings(
  _season: number,
  _type: StandingType
): Promise<Standing[]> {
  return [];
}

export async function fetchWECDrivers(season: number): Promise<Driver[]> {
  return getWECDrivers(season);
}

export async function fetchWECCircuits(season: number): Promise<Circuit[]> {
  const races = await fetchWECSchedule(season);
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
