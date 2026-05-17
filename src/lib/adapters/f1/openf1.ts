import { z } from "zod";

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
