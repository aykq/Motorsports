import type { Race, RaceDetail } from "@/types/series";
import { getCachedRaceDetail, setCachedRaceDetail } from "@/lib/cache";
import {
  jolpicaFetchPitStops,
  jolpicaFetchRoundDriverStandings,
  jolpicaFetchRoundTeamStandings,
} from "@/lib/adapters/f1/jolpica";
import {
  findOpenF1RaceSessionKey,
  fetchOpenF1Stints,
  fetchOpenF1RaceControl,
} from "@/lib/adapters/f1/openf1";
import { fetchRaceWeather } from "@/lib/weather";
import { translateRaceControlMessages } from "@/lib/gemini";

const EMPTY_DETAIL: RaceDetail = {
  pitStops: [],
  tireStints: [],
  raceControl: [],
  raceControlTr: [],
  driverStandingsAfter: [],
  teamStandingsAfter: [],
  weather: [],
};

export async function getRaceDetail(
  slug: string,
  season: number,
  round: number,
  race: Race
): Promise<RaceDetail> {
  const isCompleted = race.status === "completed";

  const cached = await getCachedRaceDetail(slug, season, round, isCompleted);
  if (cached) return cached;

  if (slug !== "f1") return EMPTY_DETAIL;

  const detail = await fetchF1RaceDetail(season, round, race, isCompleted);

  await setCachedRaceDetail(slug, season, round, detail);

  return detail;
}

export async function syncRaceDetails(
  slug: string,
  season: number,
  races: Race[]
): Promise<{ synced: number; errors: string[] }> {
  if (slug !== "f1") return { synced: 0, errors: [] };

  const errors: string[] = [];
  let synced = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const racesToSync = races.filter((r) => {
    if (r.status === "live") return true;
    if (r.status === "completed") {
      return new Date(r.date).getTime() > sevenDaysAgo;
    }
    return false;
  });

  for (const race of racesToSync) {
    try {
      const isCompleted = race.status === "completed";
      const existing = await getCachedRaceDetail(slug, season, race.round, isCompleted);
      const fresh = await fetchF1RaceDetail(season, race.round, race, isCompleted);

      const existingCount = existing?.raceControl.length ?? 0;
      const freshCount = fresh.raceControl.length;

      const existingTr = existing?.raceControlTr ?? [];
      const trIsEmpty = existingTr.length === 0 && freshCount > 0;
      const trIsBad =
        existingTr.length > 0 &&
        fresh.raceControl.length > 0 &&
        existingTr[0] === fresh.raceControl[0]?.message;
      const hasNewEvents = freshCount > existingCount;

      let raceControlTr = existingTr;

      if (hasNewEvents || trIsEmpty || trIsBad) {
        await new Promise((r) => setTimeout(r, 2000));
        const translated = await translateRaceControlMessages(
          fresh.raceControl.map((e) => e.message)
        );
        if (translated.length) raceControlTr = translated;
      }

      await setCachedRaceDetail(slug, season, race.round, { ...fresh, raceControlTr });
      synced++;
    } catch (err) {
      errors.push(`round ${race.round}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { synced, errors };
}

async function fetchF1RaceDetail(
  season: number,
  round: number,
  race: Race,
  isCompleted: boolean
): Promise<RaceDetail> {
  const [pitStopsResult, sessionKeyResult, weatherResult, driverStandingsResult, teamStandingsResult] =
    await Promise.allSettled([
      isCompleted ? jolpicaFetchPitStops(season, round) : Promise.resolve([]),
      isCompleted ? findOpenF1RaceSessionKey(season, race.date) : Promise.resolve(null),
      !isCompleted && race.circuitLat && race.circuitLng
        ? fetchRaceWeather(race.circuitLat, race.circuitLng, race.date)
        : Promise.resolve([]),
      isCompleted ? jolpicaFetchRoundDriverStandings(season, round) : Promise.resolve([]),
      isCompleted ? jolpicaFetchRoundTeamStandings(season, round) : Promise.resolve([]),
    ]);

  const sessionKey =
    sessionKeyResult.status === "fulfilled" ? sessionKeyResult.value : null;

  const [stintsResult, raceControlResult] = await Promise.allSettled([
    sessionKey ? fetchOpenF1Stints(sessionKey) : Promise.resolve([]),
    sessionKey ? fetchOpenF1RaceControl(sessionKey) : Promise.resolve([]),
  ]);

  const pitStops = pitStopsResult.status === "fulfilled" ? pitStopsResult.value : [];
  const driverStandingsAfter =
    driverStandingsResult.status === "fulfilled" ? driverStandingsResult.value : [];

  const driverNameMap = new Map(
    (race.results ?? []).map((r) => [r.driverId, r.driverName])
  );
  const enrichedPitStops = pitStops.map((p) => ({
    ...p,
    driverName: driverNameMap.get(p.driverId) ?? p.driverId,
  }));

  const raceControl = raceControlResult.status === "fulfilled" ? raceControlResult.value : [];

  return {
    pitStops: enrichedPitStops,
    tireStints: stintsResult.status === "fulfilled" ? stintsResult.value : [],
    raceControl,
    raceControlTr: [],
    driverStandingsAfter,
    teamStandingsAfter:
      teamStandingsResult.status === "fulfilled" ? teamStandingsResult.value : [],
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : [],
  };
}
