import { getAdapter } from "@/lib/adapters";
import {
  setCachedSchedule,
  setCachedStandings,
  setCachedDrivers,
} from "@/lib/cache";
import { syncRaceDetails } from "@/lib/race-detail";

export interface SyncResult {
  slug: string;
  season: number;
  racesCount: number;
  driversCount: number;
  raceDetailsSynced: number;
  errors: string[];
}

export async function syncSeries(slug: string, season: number): Promise<SyncResult> {
  const adapter = getAdapter(slug);
  if (!adapter) throw new Error(`Unknown series: ${slug}`);

  const errors: string[] = [];
  let racesCount = 0;
  let driversCount = 0;
  let raceDetailsSynced = 0;

  const [scheduleResult, driverResult, teamResult, driversResult] =
    await Promise.allSettled([
      adapter.fetchSchedule(season),
      adapter.fetchStandings(season, "driver"),
      adapter.fetchStandings(season, "team"),
      adapter.fetchDrivers(season),
    ]);

  if (scheduleResult.status === "fulfilled") {
    await setCachedSchedule(slug, season, scheduleResult.value);
    racesCount = scheduleResult.value.length;

    const detailSync = await syncRaceDetails(slug, season, scheduleResult.value);
    raceDetailsSynced = detailSync.synced;
    errors.push(...detailSync.errors);
  } else {
    errors.push(`schedule: ${scheduleResult.reason}`);
  }

  if (driverResult.status === "fulfilled") {
    await setCachedStandings(slug, season, "driver", driverResult.value);
  } else {
    errors.push(`driver standings: ${driverResult.reason}`);
  }

  if (teamResult.status === "fulfilled") {
    await setCachedStandings(slug, season, "team", teamResult.value);
  } else {
    errors.push(`team standings: ${teamResult.reason}`);
  }

  if (driversResult.status === "fulfilled") {
    await setCachedDrivers(slug, driversResult.value);
    driversCount = driversResult.value.length;
  } else {
    errors.push(`drivers: ${driversResult.reason}`);
  }

  return { slug, season, racesCount, driversCount, raceDetailsSynced, errors };
}
