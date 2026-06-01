export const revalidate = 3600;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseCoord(raw: string | null, min: number, max: number): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const latN = parseCoord(searchParams.get("lat"), -90, 90);
  const lngN = parseCoord(searchParams.get("lng"), -180, 180);
  const singleDate = searchParams.get("date");
  const startDate = searchParams.get("start_date") ?? singleDate;
  const endDate = searchParams.get("end_date") ?? singleDate;

  if (latN === null || lngN === null || !startDate) {
    return Response.json({ error: "Missing or invalid params" }, { status: 400 });
  }
  if (!DATE_RE.test(startDate) || (endDate && !DATE_RE.test(endDate))) {
    return Response.json({ error: "Invalid date format" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const effectiveEnd = endDate ?? startDate;
  const isHistorical = effectiveEnd < today;

  const baseUrl = isHistorical
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const precipParam = isHistorical
    ? "precipitation_sum"
    : "precipitation_probability_max";

  const qs = new URLSearchParams({
    latitude: String(latN),
    longitude: String(lngN),
    daily: `temperature_2m_max,temperature_2m_min,weather_code,${precipParam},wind_speed_10m_max`,
    timezone: "auto",
    start_date: startDate,
    end_date: effectiveEnd,
  });

  const res = await fetch(`${baseUrl}?${qs}`, { next: { revalidate: 3600 } });

  if (!res.ok) return Response.json(null, { status: 502 });

  const data = await res.json();
  const dates: string[] = data?.daily?.time ?? [];
  const maxTemps: (number | null)[] = data?.daily?.temperature_2m_max ?? [];
  const minTemps: (number | null)[] = data?.daily?.temperature_2m_min ?? [];
  const codes: (number | null)[] = data?.daily?.weather_code ?? [];
  const precipData: (number | null)[] = isHistorical
    ? (data?.daily?.precipitation_sum ?? [])
    : (data?.daily?.precipitation_probability_max ?? []);
  const wind: (number | null)[] = data?.daily?.wind_speed_10m_max ?? [];

  if (!dates.length) return Response.json(null, { status: 404 });

  const days = dates.map((date, i) => ({
    date,
    tempMax: Math.round(maxTemps[i] ?? 0),
    tempMin: Math.round(minTemps[i] ?? 0),
    code: codes[i] ?? 0,
    precipProbability: Math.round(precipData[i] ?? 0),
    precipUnit: isHistorical ? "mm" : "%",
    windSpeed: Math.round(wind[i] ?? 0),
  }));

  const first = days[0];
  return Response.json(
    { temp: first.tempMax, code: first.code, days },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } }
  );
}
