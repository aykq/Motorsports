import { z } from "zod";
import type { Race, Standing, Driver, Circuit, PitStop } from "@/types/series";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const SessionDateSchema = z.object({
  date: z.string(),
  time: z.string().optional(),
});

const LocationSchema = z.object({
  lat: z.string(),
  long: z.string(),
  locality: z.string(),
  country: z.string(),
});

const CircuitSchema = z.object({
  circuitId: z.string(),
  circuitName: z.string(),
  Location: LocationSchema,
});

const RaceSchema = z.object({
  season: z.string(),
  round: z.string(),
  raceName: z.string(),
  Circuit: CircuitSchema,
  date: z.string(),
  time: z.string().optional(),
  FirstPractice: SessionDateSchema.optional(),
  SecondPractice: SessionDateSchema.optional(),
  ThirdPractice: SessionDateSchema.optional(),
  Qualifying: SessionDateSchema.optional(),
  Sprint: SessionDateSchema.optional(),
  SprintShootout: SessionDateSchema.optional(),
  SprintQualifying: SessionDateSchema.optional(),
});

const ScheduleResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(RaceSchema),
    }),
  }),
});

const DriverInfoSchema = z.object({
  driverId: z.string(),
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  givenName: z.string(),
  familyName: z.string(),
  nationality: z.string(),
});

const ConstructorInfoSchema = z.object({
  constructorId: z.string(),
  name: z.string(),
  nationality: z.string().optional(),
});

const RaceResultItemSchema = z.object({
  number: z.string().optional(),
  position: z.string(),
  points: z.string(),
  Driver: DriverInfoSchema,
  Constructor: ConstructorInfoSchema,
  grid: z.string().optional(),
  laps: z.string().optional(),
  status: z.string(),
  Time: z.object({ millis: z.string().optional(), time: z.string() }).optional(),
  FastestLap: z.object({
    rank: z.string(),
    lap: z.string().optional(),
    Time: z.object({ time: z.string() }).optional(),
  }).optional(),
});

const RaceWithResultsSchema = z.object({
  round: z.string(),
  Results: z.array(RaceResultItemSchema),
});

const AllResultsResponseSchema = z.object({
  MRData: z.object({
    total: z.string(),
    RaceTable: z.object({
      Races: z.array(RaceWithResultsSchema),
    }),
  }),
});

const DriverStandingSchema = z.object({
  position: z.string(),
  points: z.string(),
  wins: z.string(),
  Driver: DriverInfoSchema,
  Constructors: z.array(ConstructorInfoSchema),
});

const ConstructorStandingSchema = z.object({
  position: z.string(),
  points: z.string(),
  wins: z.string(),
  Constructor: ConstructorInfoSchema,
});

const StandingsResponseSchema = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      StandingsLists: z.array(
        z.object({
          DriverStandings: z.array(DriverStandingSchema).optional(),
          ConstructorStandings: z.array(ConstructorStandingSchema).optional(),
        })
      ),
    }),
  }),
});

const PitStopItemSchema = z.object({
  driverId: z.string(),
  lap: z.string(),
  stop: z.string(),
  time: z.string().optional(),
  duration: z.string(),
});

const PitStopsResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(
        z.object({
          PitStops: z.array(PitStopItemSchema).optional(),
        })
      ),
    }),
  }),
});

// ─── Fetchers ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000;

async function jolpicaFetch<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MotorsportsHub/1.0 (personal project)",
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Jolpica error ${res.status}: ${path}`);
    return schema.parse(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

function buildSessionDate(s: { date: string; time?: string }): string {
  return s.time ? `${s.date}T${s.time.replace("Z", "+00:00")}` : `${s.date}T00:00:00+00:00`;
}

function detectStatus(raceDate: string): Race["status"] {
  const now = Date.now();
  const date = new Date(raceDate).getTime();
  const twoHours = 2 * 60 * 60 * 1000;
  if (date > now) return "upcoming";
  if (date > now - twoHours) return "live";
  return "completed";
}

export async function jolpicaFetchSchedule(season: number): Promise<Race[]> {
  const data = await jolpicaFetch(`/${season}.json`, ScheduleResponseSchema);
  return data.MRData.RaceTable.Races.map((r) => {
    const raceDate = buildSessionDate({ date: r.date, time: r.time });
    const sessions: Race["sessions"] = [];
    if (r.FirstPractice) sessions.push({ type: "practice1", date: buildSessionDate(r.FirstPractice) });
    if (r.SecondPractice) sessions.push({ type: "practice2", date: buildSessionDate(r.SecondPractice) });
    if (r.ThirdPractice) sessions.push({ type: "practice3", date: buildSessionDate(r.ThirdPractice) });
    if (r.SprintShootout ?? r.SprintQualifying)
      sessions.push({ type: "sprintQuali", date: buildSessionDate((r.SprintShootout ?? r.SprintQualifying)!) });
    if (r.Qualifying) sessions.push({ type: "qualifying", date: buildSessionDate(r.Qualifying) });
    if (r.Sprint) sessions.push({ type: "sprint", date: buildSessionDate(r.Sprint) });
    sessions.push({ type: "race", date: raceDate });

    return {
      round: parseInt(r.round),
      name: r.raceName,
      circuitId: r.Circuit.circuitId,
      circuitName: r.Circuit.circuitName,
      location: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      date: raceDate,
      sessions,
      status: detectStatus(raceDate),
      circuitLat: parseFloat(r.Circuit.Location.lat),
      circuitLng: parseFloat(r.Circuit.Location.long),
    };
  });
}

export async function jolpicaFetchResults(
  season: number
): Promise<Map<number, import("@/types/series").RaceResult[]>> {
  const map = new Map<number, import("@/types/series").RaceResult[]>();
  const PAGE = 100;
  let offset = 0;

  try {
    while (true) {
      const data = await jolpicaFetch(
        `/${season}/results.json?limit=${PAGE}&offset=${offset}`,
        AllResultsResponseSchema
      );

      for (const race of data.MRData.RaceTable.Races) {
        const round = parseInt(race.round);
        const existing = map.get(round) ?? [];
        map.set(round, [
          ...existing,
          ...race.Results.map((r) => ({
            position: parseInt(r.position),
            driverId: r.Driver.driverId,
            driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
            driverCode: r.Driver.code,
            driverNumber: r.Driver.permanentNumber ? parseInt(r.Driver.permanentNumber) : undefined,
            team: r.Constructor.name,
            time: r.position === "1" ? r.Time?.time : undefined,
            gap: r.position !== "1" ? r.Time?.time : undefined,
            points: parseFloat(r.points),
            status: r.status,
            fastestLap: r.FastestLap?.rank === "1",
            fastestLapTime: r.FastestLap?.rank === "1" ? r.FastestLap?.Time?.time : undefined,
            gridPosition: r.grid ? parseInt(r.grid) : undefined,
            laps: r.laps ? parseInt(r.laps) : undefined,
          })),
        ]);
      }

      const total = parseInt(data.MRData.total);
      offset += PAGE;
      if (offset >= total) break;
    }
  } catch {
    // map'te ne kadar veri toplanmışsa onu döndür
  }

  return map;
}

export async function jolpicaFetchPitStops(season: number, round: number): Promise<PitStop[]> {
  try {
    const data = await jolpicaFetch(
      `/${season}/${round}/pitstops.json?limit=100`,
      PitStopsResponseSchema
    );
    const race = data.MRData.RaceTable.Races[0];
    if (!race?.PitStops) return [];
    return race.PitStops.map((p) => ({
      driverId: p.driverId,
      driverName: p.driverId,
      lap: parseInt(p.lap),
      stop: parseInt(p.stop),
      duration: p.duration,
    }));
  } catch {
    return [];
  }
}

export async function jolpicaFetchDriverStandings(season: number): Promise<Standing[]> {
  const data = await jolpicaFetch(
    `/${season}/driverStandings.json`,
    StandingsResponseSchema
  );
  const list = data.MRData.StandingsTable.StandingsLists[0];
  if (!list?.DriverStandings) return [];
  return list.DriverStandings.map((s) => ({
    position: parseInt(s.position),
    points: parseFloat(s.points),
    wins: parseInt(s.wins),
    driver: {
      id: s.Driver.driverId,
      firstName: s.Driver.givenName,
      lastName: s.Driver.familyName,
      code: s.Driver.code,
      number: s.Driver.permanentNumber ? parseInt(s.Driver.permanentNumber) : undefined,
      nationality: s.Driver.nationality,
      team: s.Constructors[0]?.name,
      teamId: s.Constructors[0]?.constructorId,
    },
  }));
}

export async function jolpicaFetchRoundDriverStandings(season: number, round: number): Promise<Standing[]> {
  try {
    const data = await jolpicaFetch(
      `/${season}/${round}/driverStandings.json`,
      StandingsResponseSchema
    );
    const list = data.MRData.StandingsTable.StandingsLists[0];
    if (!list?.DriverStandings) return [];
    return list.DriverStandings.map((s) => ({
      position: parseInt(s.position),
      points: parseFloat(s.points),
      wins: parseInt(s.wins),
      driver: {
        id: s.Driver.driverId,
        firstName: s.Driver.givenName,
        lastName: s.Driver.familyName,
        code: s.Driver.code,
        number: s.Driver.permanentNumber ? parseInt(s.Driver.permanentNumber) : undefined,
        nationality: s.Driver.nationality,
        team: s.Constructors[0]?.name,
        teamId: s.Constructors[0]?.constructorId,
      },
    }));
  } catch {
    return [];
  }
}

export async function jolpicaFetchRoundTeamStandings(season: number, round: number): Promise<Standing[]> {
  try {
    const data = await jolpicaFetch(
      `/${season}/${round}/constructorStandings.json`,
      StandingsResponseSchema
    );
    const list = data.MRData.StandingsTable.StandingsLists[0];
    if (!list?.ConstructorStandings) return [];
    return list.ConstructorStandings.map((s) => ({
      position: parseInt(s.position),
      points: parseFloat(s.points),
      wins: parseInt(s.wins),
      team: {
        id: s.Constructor.constructorId,
        name: s.Constructor.name,
        nationality: s.Constructor.nationality,
      },
    }));
  } catch {
    return [];
  }
}

export async function jolpicaFetchTeamStandings(season: number): Promise<Standing[]> {
  const data = await jolpicaFetch(
    `/${season}/constructorStandings.json`,
    StandingsResponseSchema
  );
  const list = data.MRData.StandingsTable.StandingsLists[0];
  if (!list?.ConstructorStandings) return [];
  return list.ConstructorStandings.map((s) => ({
    position: parseInt(s.position),
    points: parseFloat(s.points),
    wins: parseInt(s.wins),
    team: {
      id: s.Constructor.constructorId,
      name: s.Constructor.name,
      nationality: s.Constructor.nationality,
    },
  }));
}

export async function jolpicaFetchDrivers(season: number): Promise<Driver[]> {
  const standings = await jolpicaFetchDriverStandings(season);
  return standings.map((s) => s.driver!);
}

export async function jolpicaFetchCircuits(season: number): Promise<Circuit[]> {
  const races = await jolpicaFetchSchedule(season);
  const seen = new Set<string>();
  return races
    .filter((r) => {
      if (seen.has(r.circuitId)) return false;
      seen.add(r.circuitId);
      return true;
    })
    .map((r) => ({
      id: r.circuitId,
      name: r.circuitName,
      location: r.location,
      country: r.country,
      lat: r.circuitLat,
      lng: r.circuitLng,
    }));
}
