import { z } from "zod";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";
import { lookupCircuitCoords } from "@/lib/circuit-coords";

const BASE_URL = "https://api.motogp.pulselive.com/motogp/v1";
const TIMEOUT_MS = 15_000;

// ─── Known category UUIDs (fetched dynamically, these are fallbacks) ──────────
// 2026 season UUIDs — updated when getCategoryUuid fails (™ symbol strip fixes dynamic lookup)
export const CATEGORY_UUIDS = {
  MotoGP: "e8c110ad-64aa-4e8e-8a86-f2f152f6a942",
  Moto2:  "549640b8-fd9c-4245-acfd-60e4bc38b25c",
  Moto3:  "954f7e65-2ef2-4423-b949-4961cc603e45",
} as const;

export const CATEGORY_LEGACY_IDS = {
  MotoGP: 3,
  Moto2:  2,
  Moto3:  1,
} as const;

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchMotogp(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { "User-Agent": "motorsports-hub/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`MotoGP API ${res.status}: ${path}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  legacy_id: z.number().optional(),
});

const SeasonSchema = z.object({
  id: z.string(),
  year: z.number(),
  current: z.boolean().optional(),
});

const CircuitInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  place: z.string().optional(),
  nation: z.string().optional(),
});

const CountrySchema = z.object({
  iso: z.string(),
  name: z.string(),
});

const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  sponsored_name: z.string().optional(),
  date_start: z.string(),
  date_end: z.string(),
  status: z.string().optional(),
  circuit: CircuitInfoSchema,
  country: CountrySchema,
  legacy_id: z.array(z.object({ categoryId: z.number(), eventId: z.number() })).optional(),
});

const TeamInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CareerStepSchema = z.object({
  season: z.number().optional(),
  number: z.number().optional(),
  team: TeamInfoSchema.optional(),
  short_nickname: z.string().nullable().optional(),
  category: z.object({ id: z.string(), name: z.string() }).optional(),
});

const RiderSchema = z.object({
  id: z.string(),
  name: z.string(),
  surname: z.string(),
  country: CountrySchema.optional(),
  current_career_step: CareerStepSchema.nullable().optional(),
  pictures: z.object({
    profile: z.object({ main: z.string().nullable().optional() }).optional(),
  }).optional(),
  retired: z.boolean().optional(),
  type: z.string().optional(),
});

const StandingEntrySchema = z.object({
  position: z.number(),
  points: z.number(),
  race_wins: z.number().optional().default(0),
  rider: z.object({
    id: z.string(),
    full_name: z.string().optional(),
    country: CountrySchema.optional(),
    number: z.number().optional(),
  }).optional(),
  team: z.object({ id: z.string(), name: z.string() }).optional(),
  constructor: z.object({ id: z.string(), name: z.string() }).optional(),
});

// ─── Session schema (per-event endpoint: /results/sessions?eventUuid=...) ─────

const EventSessionItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  date: z.string().nullable().optional(),
  number: z.number().nullable().optional(),
});

interface EventSessionTimes {
  race?: string;
  practice1?: string;
  practice2?: string;
  practice3?: string;
  qualifying?: string;
  sprint?: string;
}

async function fetchEventSessionTimes(eventUuid: string, categoryUuid: string): Promise<EventSessionTimes> {
  const times: EventSessionTimes = {};
  try {
    const raw = await fetchMotogp(`/results/sessions?eventUuid=${eventUuid}&categoryUuid=${categoryUuid}`);
    const sessions = z.array(EventSessionItemSchema).parse(raw);
    for (const s of sessions) {
      if (!s.date) continue;
      const type = s.type.toUpperCase();
      if (type === "RAC") {
        times.race = s.date;
      } else if (type === "SPR") {
        times.sprint = s.date;
      } else if (type === "Q") {
        // Q2 (number 2) belirleyici sıralama — Q1'in önüne geçer
        if ((s.number ?? 0) >= 2 || !times.qualifying) times.qualifying = s.date;
      } else if (type === "WUP") {
        times.practice3 = s.date;
      } else if (type === "FP") {
        if (!times.practice1) times.practice1 = s.date;
        else if (!times.practice2) times.practice2 = s.date;
      } else if (type === "PR") {
        if (!times.practice2) times.practice2 = s.date;
        else if (!times.practice1) times.practice1 = s.date;
      }
    }
  } catch { /* session fetch failed — caller uses defaults */ }
  return times;
}

// ─── Shared UUID helpers ──────────────────────────────────────────────────────

async function getSeasonUuid(season: number): Promise<string | null> {
  try {
    const raw = await fetchMotogp("/results/seasons");
    const seasons = z.array(SeasonSchema).parse(raw);
    return seasons.find((s) => s.year === season)?.id ?? null;
  } catch {
    return null;
  }
}

function normalizeCategoryName(s: string): string {
  return s.replace(/[™®©]/g, "").trim();
}

async function getCategoryUuid(categoryName: string, fallback: string, season: number): Promise<string> {
  try {
    const seasonUuid = await getSeasonUuid(season);
    if (!seasonUuid) return fallback;
    const raw = await fetchMotogp(`/results/categories?seasonUuid=${seasonUuid}`);
    const cats = z.array(CategorySchema).parse(raw);
    const found = cats.find((c) => normalizeCategoryName(c.name) === normalizeCategoryName(categoryName));
    if (found) return found.id;
  } catch { /* use fallback */ }
  return fallback;
}

function mapEventStatus(status?: string): RaceStatus {
  switch (status?.toUpperCase()) {
    case "FINISHED": return "completed";
    case "CURRENT":  return "live";
    default:         return "upcoming";
  }
}

// ─── Factory: returns fetch functions bound to a specific category ─────────────

export function createMotoGPFetchers(
  categoryName: keyof typeof CATEGORY_UUIDS,
  displayName: string
) {
  const fallbackUuid = CATEGORY_UUIDS[categoryName];
  const legacyCategoryId = CATEGORY_LEGACY_IDS[categoryName];

  async function fetchSchedule(season: number): Promise<Race[]> {
    try {
      const [seasonUuid, categoryUuid] = await Promise.all([
        getSeasonUuid(season),
        getCategoryUuid(categoryName, fallbackUuid, season),
      ]);
      if (!seasonUuid) return [];

      const eventsRaw = await fetchMotogp(`/results/events?seasonUuid=${seasonUuid}`);
      const events = z.array(EventSchema).parse(eventsRaw);

      // Per-event session fetch (endpoint requires eventUuid)
      const sessionTimesArr = await Promise.all(
        events.map((ev) => fetchEventSessionTimes(ev.id, categoryUuid))
      );
      const sessionMap = new Map(events.map((ev, i) => [ev.id, sessionTimesArr[i]]));

      return events.map((ev, idx) => {
        const eventId = ev.legacy_id?.find((l) => l.categoryId === legacyCategoryId)?.eventId ?? idx + 1;
        const times = sessionMap.get(ev.id) ?? {};
        // API'den gerçek saat gelirse kullan; yoksa makul varsayılanlar (İstanbul saatine göre)
        const raceDate     = times.race     ?? `${ev.date_end}T12:00:00Z`;   // 15:00 İst
        const practiceDate = times.practice1 ?? `${ev.date_start}T09:00:00Z`; // 12:00 İst
        const coords = lookupCircuitCoords(ev.circuit.name);

        const sessions: Race["sessions"] = [
          { type: "practice1", date: practiceDate },
        ];
        if (times.practice2) sessions.push({ type: "practice2", date: times.practice2 });
        if (times.practice3) sessions.push({ type: "practice3", date: times.practice3 });
        if (times.qualifying) sessions.push({ type: "qualifying", date: times.qualifying });
        if (times.sprint) sessions.push({ type: "sprint", date: times.sprint });
        sessions.push({ type: "race", date: raceDate });
        sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          round: eventId,
          name: ev.sponsored_name ?? ev.name,
          circuitId: ev.circuit.id,
          circuitName: ev.circuit.name,
          location: ev.circuit.place ?? ev.country.name,
          country: ev.country.name,
          date: raceDate,
          sessions,
          status: mapEventStatus(ev.status),
          ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
        };
      });
    } catch (err) {
      console.error(`[${displayName}] fetchSchedule error:`, err);
      return [];
    }
  }

  async function fetchStandings(season: number, type: StandingType): Promise<Standing[]> {
    try {
      const [seasonUuid, categoryUuid] = await Promise.all([
        getSeasonUuid(season),
        getCategoryUuid(categoryName, fallbackUuid, season),
      ]);
      if (!seasonUuid) return [];

      const apiType = type === "driver" ? "riders" : "constructors";
      const raw = await fetchMotogp(
        `/results/standings?seasonUuid=${seasonUuid}&categoryUuid=${categoryUuid}&type=${apiType}`
      );

      const parsed = z.object({ classification: z.array(StandingEntrySchema) }).safeParse(raw);
      if (!parsed.success) {
        console.warn(`[${displayName}] standings parse failed for type:`, type, parsed.error.message.slice(0, 100));
        return [];
      }
      const entries = parsed.data.classification;

      if (type === "team") {
        // MotoGP API doesn't have a separate team standings endpoint — aggregate from rider data
        const teamMap = new Map<string, { id: string; name: string; points: number }>();
        for (const entry of entries) {
          if (!entry.team) continue;
          const existing = teamMap.get(entry.team.id);
          if (!existing) {
            teamMap.set(entry.team.id, { id: entry.team.id, name: entry.team.name, points: entry.points });
          } else {
            existing.points += entry.points;
          }
        }
        const teams = Array.from(teamMap.values()).sort((a, b) => b.points - a.points);
        return teams.map((t, i) => ({
          position: i + 1,
          points: t.points,
          wins: 0,
          team: { id: t.id, name: t.name },
        }));
      }

      return entries.map((entry) => ({
        position: entry.position,
        points: entry.points,
        wins: entry.race_wins ?? 0,
        ...(entry.rider ? {
          driver: {
            id: entry.rider.id,
            firstName: entry.rider.full_name?.split(" ")[0] ?? "",
            lastName: entry.rider.full_name?.split(" ").slice(1).join(" ") ?? "",
            nationality: entry.rider.country?.name ?? "",
            team: entry.team?.name,
            teamId: entry.team?.id,
            number: entry.rider.number,
          },
        } : {}),
      }));
    } catch (err) {
      console.error(`[${displayName}] fetchStandings error:`, err);
      return [];
    }
  }

  async function fetchRiders(season: number): Promise<Driver[]> {
    try {
      const categoryUuid = await getCategoryUuid(categoryName, fallbackUuid, season);
      const raw = await fetchMotogp(`/riders?seasonYear=${season}&categoryUuid=${categoryUuid}`);

      if (!Array.isArray(raw)) {
        console.error(`[${displayName}] riders response is not an array`);
        return [];
      }

      const drivers: Driver[] = [];
      for (const item of raw) {
        const parsed = RiderSchema.safeParse(item);
        if (!parsed.success) {
          console.warn(`[${displayName}] rider parse failed:`, parsed.error.message.slice(0, 120));
          continue;
        }
        const r = parsed.data;
        if (r.retired === true) continue;

        // Filter by category name — UUID systems differ between /riders and /results/categories
        const riderCategoryName = r.current_career_step?.category?.name;
        if (riderCategoryName && normalizeCategoryName(riderCategoryName) !== normalizeCategoryName(categoryName)) continue;

        drivers.push({
          id: r.id,
          firstName: r.name,
          lastName: r.surname,
          nationality: r.country?.name ?? "",
          team: r.current_career_step?.team?.name,
          teamId: r.current_career_step?.team?.id,
          number: r.current_career_step?.number,
          code: r.current_career_step?.short_nickname ?? undefined,
          image: r.pictures?.profile?.main ?? undefined,
        });
      }

      return drivers;
    } catch (err) {
      console.error(`[${displayName}] fetchRiders error:`, err);
      return [];
    }
  }

  async function fetchCircuits(season: number): Promise<Circuit[]> {
    try {
      const seasonUuid = await getSeasonUuid(season);
      if (!seasonUuid) return [];

      const raw = await fetchMotogp(`/results/events?seasonUuid=${seasonUuid}`);
      const events = z.array(EventSchema).parse(raw);

      const seen = new Set<string>();
      const circuits: Circuit[] = [];
      for (const ev of events) {
        if (!seen.has(ev.circuit.id)) {
          seen.add(ev.circuit.id);
          circuits.push({
            id: ev.circuit.id,
            name: ev.circuit.name,
            location: ev.circuit.place ?? ev.country.name,
            country: ev.country.name,
          });
        }
      }
      return circuits;
    } catch (err) {
      console.error(`[${displayName}] fetchCircuits error:`, err);
      return [];
    }
  }

  return { fetchSchedule, fetchStandings, fetchRiders, fetchCircuits };
}
