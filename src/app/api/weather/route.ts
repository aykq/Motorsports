export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const date = searchParams.get("date");

  if (!lat || !lng || !date) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,weather_code` +
      `&timezone=auto&start_date=${date}&end_date=${date}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) return Response.json(null, { status: 502 });

  const data = await res.json();
  const temp = data?.daily?.temperature_2m_max?.[0];
  const code = data?.daily?.weather_code?.[0];

  if (temp == null || code == null) return Response.json(null, { status: 404 });

  return Response.json(
    { temp: Math.round(temp), code },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } }
  );
}
