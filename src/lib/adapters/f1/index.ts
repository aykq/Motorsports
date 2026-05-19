import type { SeriesAdapter, Race, Standing, Driver, Circuit, StandingType } from "@/types/series";
import {
  jolpicaFetchSchedule,
  jolpicaFetchResults,
  jolpicaFetchDriverStandings,
  jolpicaFetchTeamStandings,
  jolpicaFetchDrivers,
  jolpicaFetchCircuits,
} from "./jolpica";
import { fetchLatestOpenF1Drivers } from "./openf1";

async function mergeDriverHeadshots(
  drivers: Driver[],
  season: number
): Promise<Driver[]> {
  try {
    const openF1Drivers = await fetchLatestOpenF1Drivers(season);
    const headshotMap = new Map(
      openF1Drivers.map((d) => [d.name_acronym?.toUpperCase(), d.headshot_url ?? undefined])
    );
    return drivers.map((d) => ({
      ...d,
      image: d.code ? (headshotMap.get(d.code.toUpperCase()) ?? d.image) : d.image,
    }));
  } catch {
    return drivers;
  }
}

export const f1Adapter: SeriesAdapter = {
  slug: "f1",
  name: "Formula 1",

  fetchSchedule: async (season: number): Promise<Race[]> => {
    const [races, resultsMap] = await Promise.all([
      jolpicaFetchSchedule(season),
      jolpicaFetchResults(season),
    ]);
    return races.map((race) => ({
      ...race,
      results: resultsMap.get(race.round),
    }));
  },

  fetchStandings: (season: number, type: StandingType): Promise<Standing[]> =>
    type === "driver"
      ? jolpicaFetchDriverStandings(season)
      : jolpicaFetchTeamStandings(season),

  fetchDrivers: async (season: number): Promise<Driver[]> => {
    const drivers = await jolpicaFetchDrivers(season);
    return mergeDriverHeadshots(drivers, season);
  },

  fetchCircuits: (season: number): Promise<Circuit[]> => jolpicaFetchCircuits(season),
};
