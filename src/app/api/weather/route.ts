export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const singleDate = searchParams.get("date");
  const startDate = searchParams.get("start_date") ?? singleDate;
  const endDate = searchParams.get("end_date") ?? singleDate;

  if (!lat || !lng || !startDate) {
    return Response.json({ error: "Missing params" }, { status: 400 });
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

  const res = await fetch(
    `${baseUrl}` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,${precipParam},wind_speed_10m_max` +
      `&timezone=auto&start_date=${startDate}&end_date=${effectiveEnd}`,
    { next: { revalidate: 3600 } }
  );

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
