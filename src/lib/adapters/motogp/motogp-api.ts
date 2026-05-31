import { z } from "zod";
import type { Race, Standing, Driver, Circuit, StandingType, RaceStatus } from "@/types/series";

const BASE_URL = "https://api.motogp.pulselive.com/motogp/v1";
const TIMEOUT_MS = 15_000;

// ─── Known category UUIDs (fetched dynamically, these are fallbacks) ──────────
export const CATEGORY_UUIDS = {
  MotoGP: "737ab122-76e1-4081-bedb-334caaa18c70",
  Moto2:  "ea854a67-73a4-4a28-ac77-d67b3b2a530a",
  Moto3:  "1ab203aa-e292-4842-8bed-971911357af1",
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
  wins: z.number().optional().default(0),
  rider: z.object({
    id: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    country: CountrySchema.optional(),
    current_career_step: CareerStepSchema.nullable().optional(),
  }).optional(),
  team: z.object({ id: z.string(), name: z.string() }).optional(),
  constructor: z.object({ id: z.string(), name: z.string() }).optional(),
});

// ─── Session schema ───────────────────────────────────────────────────────────

const SessionTypeSchema = z.union([
  z.string(),
  z.object({ id: z.string().optional(), name: z.string().optional() }),
]);

const RaceSessionSchema = z.object({
  id: z.string(),
  type: SessionTypeSchema.nullable().optional(),
  date_start: z.string().nullable().optional(),
  event: z.object({ id: z.string() }).nullable().optional(),
});

interface EventSessionTimes { race?: string; practice1?: string; }

function extractTypeId(type: z.infer<typeof SessionTypeSchema> | null | undefined): string {
  if (!type) return "";
  if (typeof type === "string") return type.toUpperCase();
  return (type.id ?? "").toUpperCase();
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

async function fetchAllSessionsMap(seasonUuid: string, categoryUuid: string): Promise<Map<string, EventSessionTimes>> {
  const map = new Map<string, EventSessionTimes>();
  try {
    const raw = await fetchMotogp(
      `/results/sessions?seasonUuid=${seasonUuid}&categoryUuid=${categoryUuid}&page=1&pageSize=200`
    );
    const asArray = z.array(RaceSessionSchema).safeParse(raw);
    const asWrapped = z.object({ sessions: z.array(RaceSessionSchema) }).safeParse(raw);
    const sessions = asArray.success ? asArray.data
      : asWrapped.success ? asWrapped.data.sessions
      : [];

    for (const s of sessions) {
      if (!s.event?.id || !s.date_start) continue;
      const type = extractTypeId(s.type);
      if (!map.has(s.event.id)) map.set(s.event.id, {});
      const entry = map.get(s.event.id)!;
      if (type === "RAC" || type === "RACE") {
        entry.race = s.date_start;
      } else if (!entry.practice1 && (type === "FP" || type.startsWith("FP") || type === "P")) {
        entry.practice1 = s.date_start;
      }
    }
  } catch { /* session endpoint unavailable — caller uses fallbacks */ }
  return map;
}

async function getCategoryUuid(categoryName: string, fallback: string, season: number): Promise<string> {
  try {
    const raw = await fetchMotogp(`/categories?seasonYear=${season}`);
    const cats = z.array(CategorySchema).parse(raw);
    const found = cats.find((c) => c.name === categoryName);
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

      const [eventsRaw, sessionMap] = await Promise.all([
        fetchMotogp(`/results/events?seasonUuid=${seasonUuid}`),
        fetchAllSessionsMap(seasonUuid, categoryUuid),
      ]);

      const events = z.array(EventSchema).parse(eventsRaw);

      return events.map((ev, idx) => {
        const eventId = ev.legacy_id?.find((l) => l.categoryId === legacyCategoryId)?.eventId ?? idx + 1;
        const times = sessionMap.get(ev.id) ?? {};
        // API'den gerçek saat gelirse kullan; yoksa makul varsayılanlar (İstanbul saatine göre)
        const raceDate     = times.race     ?? `${ev.date_end}T12:00:00Z`;   // 15:00 İst
        const practiceDate = times.practice1 ?? `${ev.date_start}T09:00:00Z`; // 12:00 İst
        return {
          round: eventId,
          name: ev.sponsored_name ?? ev.name,
          circuitId: ev.circuit.id,
          circuitName: ev.circuit.name,
          location: ev.circuit.place ?? ev.country.name,
          country: ev.country.name,
          date: raceDate,
          sessions: [
            { type: "practice1" as const, date: practiceDate },
            { type: "race" as const, date: raceDate },
          ],
          status: mapEventStatus(ev.status),
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

      const asWrapped = z.object({ classification: z.array(StandingEntrySchema) }).safeParse(raw);
      const asArray   = z.array(StandingEntrySchema).safeParse(raw);
      const entries   = asWrapped.success ? asWrapped.data.classification
                      : asArray.success   ? asArray.data
                      : null;

      if (!entries) {
        console.warn(`[${displayName}] standings parse failed for type:`, type);
        return [];
      }

      return entries.map((entry) => ({
        position: entry.position,
        points: entry.points,
        wins: entry.wins ?? 0,
        ...(type === "driver" && entry.rider ? {
          driver: {
            id: entry.rider.id,
            firstName: entry.rider.name ?? "",
            lastName: entry.rider.surname ?? "",
            nationality: entry.rider.country?.name ?? "",
            team: entry.rider.current_career_step?.team?.name,
            teamId: entry.rider.current_career_step?.team?.id,
            number: entry.rider.current_career_step?.number,
            code: entry.rider.current_career_step?.short_nickname ?? undefined,
          },
        } : {}),
        ...(type === "team" && (entry.team ?? entry.constructor) ? {
          team: {
            id: (entry.team ?? entry.constructor)!.id,
            name: (entry.team ?? entry.constructor)!.name,
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

        // Filter by category — API returns all categories despite the UUID param
        const riderCategoryId = r.current_career_step?.category?.id;
        if (riderCategoryId && riderCategoryId !== categoryUuid) continue;

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
