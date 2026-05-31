import { z } from "zod";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";

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

// ─── Fetch Functions ──────────────────────────────────────────────────────────

export async function fetchWECSchedule(season: number): Promise<Race[]> {
  try {
    const raw = await fetchSportsDB(
      `/eventsseason.php?id=${THESPORTSDB_WEC_ID}&s=${season}`
    );
    const parsed = EventsResponseSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.events) return [];

    const events = parsed.data.events;

    // Group by round — intRound can be number or string
    const roundMap = new Map<number, typeof events>();
    for (const ev of events) {
      const raw = ev.intRound;
      const round = raw != null ? (typeof raw === "number" ? raw : parseInt(raw, 10)) || 1 : 1;
      if (!roundMap.has(round)) roundMap.set(round, []);
      roundMap.get(round)!.push(ev);
    }

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
      });
    }

    return races.sort((a, b) => a.round - b.round);
  } catch (err) {
    console.error("[WEC] fetchSchedule error:", err);
    return [];
  }
}

// WEC standings are not available in TheSportsDB free tier — returns empty
export async function fetchWECStandings(
  _season: number,
  _type: StandingType
): Promise<Standing[]> {
  return [];
}

// WEC driver/team entries are not available in TheSportsDB free tier — returns empty
export async function fetchWECDrivers(_season: number): Promise<Driver[]> {
  return [];
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
