import { z } from "zod";
import type { TireStint, TireCompound, RaceControlEvent } from "@/types/series";

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
