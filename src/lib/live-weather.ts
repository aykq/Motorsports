export interface LiveWeatherData {
  airTemp: number;
  trackTemp?: number;
  humidity?: number;
  windSpeed?: number;
  rainfall: boolean;
  updatedAt: string;
}

interface CacheEntry {
  data: LiveWeatherData;
  ts: number;
}

const weatherCache = new Map<string, CacheEntry>();
const meetingKeyCache = new Map<string, { key: number; ts: number }>();
const WEATHER_TTL = 5 * 60 * 1000;
const MEETING_KEY_TTL = 60 * 60 * 1000;
const OF1_HEADERS = { "User-Agent": "MotorsportsHub/1.0" };

async function resolveMeetingKey(raceDate: string): Promise<number | null> {
  const cacheKey = `mk_${raceDate}`;
  const cached = meetingKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < MEETING_KEY_TTL) return cached.key;

  const year = new Date(raceDate).getFullYear();
  const raceTs = new Date(raceDate).getTime();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://api.openf1.org/v1/sessions?session_type=Race&year=${year}`,
      { headers: OF1_HEADERS, signal: controller.signal }
    );
    if (!res.ok) return null;
    const sessions: Array<{ meeting_key: number; date_start: string }> = await res.json();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nearby = sessions
      .filter((s) => Math.abs(new Date(s.date_start).getTime() - raceTs) < SEVEN_DAYS_MS)
      .sort(
        (a, b) =>
          Math.abs(new Date(a.date_start).getTime() - raceTs) -
          Math.abs(new Date(b.date_start).getTime() - raceTs)
      );
    const key = nearby[0]?.meeting_key ?? null;
    if (key) meetingKeyCache.set(cacheKey, { key, ts: Date.now() });
    return key;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromOpenF1(meetingKey: number): Promise<LiveWeatherData | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://api.openf1.org/v1/weather?meeting_key=${meetingKey}`,
      { headers: OF1_HEADERS, signal: controller.signal }
    );
    if (!res.ok) return null;
    const wx: Array<{
      air_temperature: number;
      track_temperature?: number;
      humidity?: number;
      wind_speed?: number;
      rainfall: number | boolean;
    }> = await res.json();
    if (!wx.length) return null;
    const last = wx[wx.length - 1];
    return {
      airTemp: Math.round(last.air_temperature),
      trackTemp: last.track_temperature != null ? Math.round(last.track_temperature) : undefined,
      humidity: last.humidity != null ? Math.round(last.humidity) : undefined,
      windSpeed: last.wind_speed != null ? Math.round(last.wind_speed) : undefined,
      rainfall: !!last.rainfall,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLiveWeather(raceDate: string): Promise<LiveWeatherData | null> {
  const cached = weatherCache.get(raceDate);
  if (cached && Date.now() - cached.ts < WEATHER_TTL) return cached.data;
  return refreshLiveWeather(raceDate);
}

export async function refreshLiveWeather(raceDate: string): Promise<LiveWeatherData | null> {
  const meetingKey = await resolveMeetingKey(raceDate);
  if (!meetingKey) return weatherCache.get(raceDate)?.data ?? null;

  const data = await fetchFromOpenF1(meetingKey);
  if (!data) return weatherCache.get(raceDate)?.data ?? null;

  weatherCache.set(raceDate, { data, ts: Date.now() });
  return data;
}
