import { NextRequest, NextResponse } from "next/server";
import {
  getCachedSchedule,
  getCachedStandings,
  getCachedDrivers,
} from "@/lib/cache";
import { syncSeries } from "@/lib/sync";
import { getAdapter } from "@/lib/adapters";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const season = parseInt(
    req.nextUrl.searchParams.get("season") ?? String(new Date().getFullYear())
  );

  if (!getAdapter(slug)) {
    return NextResponse.json({ error: "Unknown series" }, { status: 404 });
  }

  const [scheduleCache, driverStandingsCache, teamStandingsCache, driversCache] =
    await Promise.all([
      getCachedSchedule(slug, season),
      getCachedStandings(slug, season, "driver"),
      getCachedStandings(slug, season, "team"),
      getCachedDrivers(slug),
    ]);

  const cacheEmpty =
    !scheduleCache.races.length &&
    !driverStandingsCache.standings.length;

  if (cacheEmpty) {
    try {
      await syncSeries(slug, season);
      const [s, ds, ts, dr] = await Promise.all([
        getCachedSchedule(slug, season),
        getCachedStandings(slug, season, "driver"),
        getCachedStandings(slug, season, "team"),
        getCachedDrivers(slug),
      ]);
      return NextResponse.json({
        slug,
        season,
        schedule: s.races,
        standings: { driver: ds.standings, team: ts.standings },
        drivers: dr.drivers,
        fresh: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // stale-while-revalidate: arka planda sync tetikle, mevcut veriyi döndür
  const stale =
    !scheduleCache.fresh ||
    !driverStandingsCache.fresh ||
    !teamStandingsCache.fresh;

  if (stale) {
    syncSeries(slug, season).catch(console.error);
  }

  return NextResponse.json({
    slug,
    season,
    schedule: scheduleCache.races,
    standings: {
      driver: driverStandingsCache.standings,
      team: teamStandingsCache.standings,
    },
    drivers: driversCache.drivers,
    fresh: !stale,
  });
}
