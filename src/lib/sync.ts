import { getAdapter } from "@/lib/adapters";
import {
  getCachedSchedule,
  setCachedSchedule,
  setCachedStandings,
  setCachedDrivers,
} from "@/lib/cache";
import { syncRaceDetails } from "@/lib/race-detail";
import type { Race } from "@/types/series";

export interface SyncResult {
  slug: string;
  season: number;
  racesCount: number;
  driversCount: number;
  raceDetailsSynced: number;
  errors: string[];
}

/**
 * Önceki sync'te DB'de olan ama yeni API verisinde artık olmayan round'ları
 * "cancelled" olarak işaretleyip listeye ekler.
 *
 * Nasıl çalışır:
 *   - Her seri için API schedule çekilir (yeni liste)
 *   - DB'deki önceki liste ile diff alınır
 *   - DB'de var + yeni listede yok + zaten cancelled değil → iptal edildi
 *   - Yarış tarihi geçmemişse de iptal sayılır (sezon ortası duyuru)
 *
 * False-positive riski: API geçici hata verirse bir round kaybolabilir.
 * Ancak bir sonraki sync'te Jolpica o round'u geri getirirse upsert
 * otomatik olarak durumu düzeltir (cancelled → upcoming/completed).
 */
async function mergeRemovedAsCancelled(
  slug: string,
  season: number,
  incomingRaces: Race[]
): Promise<Race[]> {
  const { races: existing } = await getCachedSchedule(slug, season);
  if (!existing.length) return incomingRaces;

  const incomingRoundSet = new Set(incomingRaces.map((r) => r.round));

  const removedRaces = existing.filter(
    (r) =>
      !incomingRoundSet.has(r.round) && // yeni API listesinde yok
      r.status !== "cancelled"           // zaten iptal değil
  );

  if (!removedRaces.length) return incomingRaces;

  return [
    ...incomingRaces,
    ...removedRaces.map((r) => ({ ...r, status: "cancelled" as const })),
  ];
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
    // API'den kalkan round'ları iptal olarak koru
    const racesWithCancelled = await mergeRemovedAsCancelled(
      slug,
      season,
      scheduleResult.value
    );
    await setCachedSchedule(slug, season, racesWithCancelled);
    racesCount = racesWithCancelled.length;

    const detailSync = await syncRaceDetails(slug, season, racesWithCancelled);
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
