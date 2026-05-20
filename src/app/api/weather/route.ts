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

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&start_date=${startDate}&end_date=${endDate}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) return Response.json(null, { status: 502 });

  const data = await res.json();
  const dates: string[] = data?.daily?.time ?? [];
  const maxTemps: number[] = data?.daily?.temperature_2m_max ?? [];
  const minTemps: number[] = data?.daily?.temperature_2m_min ?? [];
  const codes: number[] = data?.daily?.weather_code ?? [];
  const precip: number[] = data?.daily?.precipitation_probability_max ?? [];
  const wind: number[] = data?.daily?.wind_speed_10m_max ?? [];

  if (!dates.length) return Response.json(null, { status: 404 });

  const days = dates.map((date, i) => ({
    date,
    tempMax: Math.round(maxTemps[i] ?? 0),
    tempMin: Math.round(minTemps[i] ?? 0),
    code: codes[i] ?? 0,
    precipProbability: precip[i] ?? 0,
    windSpeed: Math.round(wind[i] ?? 0),
  }));

  const first = days[0];
  return Response.json(
    { temp: first.tempMax, code: first.code, days },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } }
  );
}
