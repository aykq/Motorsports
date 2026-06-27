import { z } from "zod";
import type { TireStint, TireCompound, RaceControlEvent, PracticeDriverResult } from "@/types/series";

const BASE_URL = "https://api.openf1.org/v1";

const OpenF1SessionSchema = z.object({
  session_key: z.number(),
  session_name: z.string(),
  session_type: z.string(),
  date_start: z.string(),
  date_end: z.string().optional(),
  year: z.number(),
  circuit_short_name: z.string(),
  country_name: z.string(),
  location: z.string(),
  meeting_key: z.number(),
});

const OpenF1DriverSchema = z.object({
  driver_number: z.number(),
  broadcast_name: z.string().optional(),
  full_name: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name_acronym: z.string().optional(),
  team_name: z.string().optional(),
  team_colour: z.string().optional(),
  headshot_url: z.string().nullable().optional(),
  country_code: z.string().optional(),
  session_key: z.number(),
  meeting_key: z.number(),
});

const OpenF1StintSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  stint_number: z.number(),
  lap_start: z.number(),
  lap_end: z.number().nullable().optional(),
  compound: z.string().nullable().optional(),
  tyre_age_at_start: z.number().nullable().optional(),
  meeting_key: z.number().optional(),
});

const OpenF1RaceControlSchema = z.object({
  session_key: z.number(),
  date: z.string().optional(),
  driver_number: z.number().nullable().optional(),
  flag: z.string().nullable().optional(),
  lap_number: z.number().nullable().optional(),
  message: z.string(),
  scope: z.string().nullable().optional(),
  sector: z.number().nullable().optional(),
  category: z.string().optional(),
  meeting_key: z.number().optional(),
});

export type OpenF1Session = z.infer<typeof OpenF1SessionSchema>;
export type OpenF1Driver = z.infer<typeof OpenF1DriverSchema>;

const FETCH_TIMEOUT_MS = 15_000;

async function openF1Fetch<T>(path: string, schema: z.ZodType<T>): Promise<T> {
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
    if (!res.ok) throw new Error(`OpenF1 error ${res.status}: ${path}`);
    return schema.parse(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOpenF1Sessions(year: number): Promise<OpenF1Session[]> {
  return openF1Fetch(`/sessions?year=${year}`, z.array(OpenF1SessionSchema));
}

export async function fetchOpenF1Drivers(sessionKey: number): Promise<OpenF1Driver[]> {
  const drivers = await openF1Fetch(
    `/drivers?session_key=${sessionKey}`,
    z.array(OpenF1DriverSchema)
  );
  const seen = new Set<number>();
  return drivers.filter((d) => {
    if (seen.has(d.driver_number)) return false;
    seen.add(d.driver_number);
    return true;
  });
}

export async function fetchLatestOpenF1Drivers(year: number): Promise<OpenF1Driver[]> {
  const sessions = await fetchOpenF1Sessions(year);
  const raceSession = sessions
    .filter((s) => s.session_type === "Race")
    .sort((a, b) => b.date_start.localeCompare(a.date_start))[0];
  if (!raceSession) return [];
  return fetchOpenF1Drivers(raceSession.session_key);
}

export async function findOpenF1RaceSessionKey(
  year: number,
  raceDateStr: string
): Promise<number | null> {
  try {
    const sessions = await fetchOpenF1Sessions(year);
    const raceDayStr = new Date(raceDateStr).toISOString().split("T")[0];
    const session = sessions
      .filter((s) => s.session_type === "Race")
      .find((s) => s.date_start.startsWith(raceDayStr));
    return session?.session_key ?? null;
  } catch {
    return null;
  }
}

function normalizeCompound(raw: string | null | undefined): TireCompound {
  const upper = (raw ?? "").toUpperCase();
  if (upper === "SOFT") return "SOFT";
  if (upper === "MEDIUM") return "MEDIUM";
  if (upper === "HARD") return "HARD";
  if (upper === "INTERMEDIATE") return "INTERMEDIATE";
  if (upper === "WET") return "WET";
  return "UNKNOWN";
}

export async function fetchOpenF1Stints(sessionKey: number): Promise<TireStint[]> {
  try {
    const raw = await openF1Fetch(
      `/stints?session_key=${sessionKey}`,
      z.array(OpenF1StintSchema)
    );
    return raw
      .filter((s) => s.lap_end != null)
      .map((s) => ({
        driverNumber: s.driver_number,
        compound: normalizeCompound(s.compound),
        lapStart: s.lap_start,
        lapEnd: s.lap_end!,
        tyreAgeAtStart: s.tyre_age_at_start ?? 0,
      }));
  } catch {
    return [];
  }
}

const SESSION_TYPE_TO_OF1_NAME: Record<string, string> = {
  practice1: "Practice 1",
  practice2: "Practice 2",
  practice3: "Practice 3",
  qualifying: "Qualifying",
  sprintQuali: "Sprint Qualifying",
  sprint: "Sprint",
  race: "Race",
};

export async function findOpenF1AllSessionKeys(
  year: number,
  sessions: Array<{ type: string; date: string }>
): Promise<Map<string, number>> {
  const keyMap = new Map<string, number>();
  try {
    const of1Sessions = await fetchOpenF1Sessions(year);
    for (const session of sessions) {
      const of1Name = SESSION_TYPE_TO_OF1_NAME[session.type];
      const dayStr = new Date(session.date).toISOString().split("T")[0];
      let match = of1Sessions.find(
        (s) => s.session_name === of1Name && s.date_start.startsWith(dayStr)
      );
      if (!match) {
        const sameDay = of1Sessions.filter((s) => s.date_start.startsWith(dayStr));
        const ts = new Date(session.date).getTime();
        sameDay.sort(
          (a, b) =>
            Math.abs(new Date(a.date_start).getTime() - ts) -
            Math.abs(new Date(b.date_start).getTime() - ts)
        );
        match = sameDay[0];
      }
      if (match) keyMap.set(session.type, match.session_key);
    }
  } catch { /* silent */ }
  return keyMap;
}

function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secStr = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${mins}:${secStr}`;
}

function lapTimeToMs(timeStr: string): number {
  const [minStr, secStr] = timeStr.split(":");
  if (!minStr || !secStr) return Infinity;
  return (parseInt(minStr) * 60 + parseFloat(secStr)) * 1000;
}

export async function fetchOpenF1PracticeResults(
  sessionKey: number
): Promise<PracticeDriverResult[]> {
  try {
    // z.record ile raw fetch — API field type değişimlerine karşı dayanıklı
    const [rawLaps, drivers] = await Promise.all([
      openF1Fetch(`/laps?session_key=${sessionKey}`, z.array(z.record(z.string(), z.unknown()))),
      fetchOpenF1Drivers(sessionKey),
    ]);

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
    const bestByDriver = new Map<number, number>();

    for (const lap of rawLaps) {
      const driverNum = typeof lap.driver_number === "number" ? lap.driver_number : null;
      const lapDuration = typeof lap.lap_duration === "number" ? lap.lap_duration : null;
      const isPitOut = lap.is_pit_out_lap === true;

      if (!driverNum || !lapDuration || isPitOut || lapDuration <= 0) continue;

      const current = bestByDriver.get(driverNum);
      if (current == null || lapDuration < current) {
        bestByDriver.set(driverNum, lapDuration);
      }
    }

    const results: PracticeDriverResult[] = [];
    for (const [driverNum, bestSecs] of bestByDriver) {
      const driver = driverMap.get(driverNum);
      results.push({
        position: 0,
        driverNumber: driverNum,
        driverName: driver?.full_name ?? `#${driverNum}`,
        driverCode: driver?.name_acronym,
        team: driver?.team_name,
        lapTime: formatLapTime(bestSecs),
      });
    }

    results.sort((a, b) => lapTimeToMs(a.lapTime) - lapTimeToMs(b.lapTime));
    results.forEach((r, i) => { r.position = i + 1; });

    if (results.length > 0) {
      const fastestMs = lapTimeToMs(results[0]!.lapTime);
      results.forEach((r, i) => {
        if (i > 0) {
          const gapMs = lapTimeToMs(r.lapTime) - fastestMs;
          r.gap = `+${(gapMs / 1000).toFixed(3)}`;
        }
      });
    }

    return results;
  } catch {
    return [];
  }
}

function isNotableRaceControlEvent(msg: string, flag: string | null | undefined, category: string | undefined): boolean {
  const upper = msg.toUpperCase();
  if (category === "SafetyCar") return true;
  if (flag === "RED") return true;
  if (upper.includes("SAFETY CAR")) return true;
  if (upper.includes("VIRTUAL SAFETY CAR")) return true;
  if (upper.includes("PENALTY")) return true;
  if (upper.includes("DISQUALIFIED")) return true;
  if (upper.includes("BLACK AND WHITE")) return true;
  if (upper.includes("INVESTIGATION")) return true;
  if (upper.includes("RED FLAG")) return true;
  if (upper.includes("RACE SUSPENDED")) return true;
  if (upper.includes("RACE RESTART")) return true;
  return false;
}

export async function fetchOpenF1RaceControl(sessionKey: number): Promise<RaceControlEvent[]> {
  try {
    const raw = await openF1Fetch(
      `/race_control?session_key=${sessionKey}`,
      z.array(OpenF1RaceControlSchema)
    );
    return raw
      .filter((e) => isNotableRaceControlEvent(e.message, e.flag, e.category))
      .map((e) => ({
        lap: e.lap_number ?? undefined,
        category: e.category ?? "Other",
        message: e.message,
        flag: e.flag ?? undefined,
        driverNumber: e.driver_number ?? undefined,
      }));
  } catch {
    return [];
  }
}

export async function openf1IsF1SessionFinished(
  year: number,
  sessionDateISO: string,
  sessionType: string,
  bufferMs = 5 * 60 * 1000
): Promise<boolean> {
  try {
    const of1Name = SESSION_TYPE_TO_OF1_NAME[sessionType];
    if (!of1Name) return false;
    const sessions = await fetchOpenF1Sessions(year);
    const dayStr = new Date(sessionDateISO).toISOString().split("T")[0];
    const session = sessions.find(
      (s) => s.session_name === of1Name && s.date_start.startsWith(dayStr)
    );
    if (!session) return false;
    const flags = await openF1Fetch(
      `/race_control?session_key=${session.session_key}&category=Flag`,
      z.array(OpenF1RaceControlSchema)
    );
    const chequeredTimes = flags
      .filter((e) => e.flag === "CHEQUERED" && e.date)
      .map((e) => new Date(e.date!).getTime());
    if (!chequeredTimes.length) return false;
    const lastChequered = Math.max(...chequeredTimes);
    return Date.now() > lastChequered + bufferMs;
  } catch {
    return false;
  }
}
