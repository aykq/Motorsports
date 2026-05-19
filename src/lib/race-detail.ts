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

const EMPTY_DETAIL: RaceDetail = {
  pitStops: [],
  tireStints: [],
  raceControl: [],
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

  return {
    pitStops: enrichedPitStops,
    tireStints: stintsResult.status === "fulfilled" ? stintsResult.value : [],
    raceControl: raceControlResult.status === "fulfilled" ? raceControlResult.value : [],
    driverStandingsAfter,
    teamStandingsAfter:
      teamStandingsResult.status === "fulfilled" ? teamStandingsResult.value : [],
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : [],
  };
}
