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
import { getF1DriverImage } from "./driver-images";
import { scrapeF1RaceResults } from "./motorsport-com-scraper";

async function mergeDriverHeadshots(
  drivers: Driver[],
  season: number
): Promise<Driver[]> {
  const withLocal = drivers.map((d) => ({
    ...d,
    image: getF1DriverImage(d.id) ?? d.image,
  }));

  const stillMissing = withLocal.some((d) => !d.image);
  if (!stillMissing) return withLocal;

  try {
    const openF1Drivers = await fetchLatestOpenF1Drivers(season);
    const headshotMap = new Map(
      openF1Drivers.map((d) => [d.name_acronym?.toUpperCase(), d.headshot_url ?? undefined])
    );
    return withLocal.map((d) => ({
      ...d,
      image: d.image ?? (d.code ? headshotMap.get(d.code.toUpperCase()) : undefined),
    }));
  } catch {
    return withLocal;
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

    const now = Date.now();
    return Promise.all(
      races.map(async (race) => {
        const jolpicaResults = resultsMap.get(race.round);
        if (jolpicaResults?.length) return { ...race, results: jolpicaResults };

        // Jolpica sonuçları yayınlamadan önce (genellikle birkaç saat) motorsport.com
        // kullan — sadece son 48 saatte bitmiş, iptal olmayan yarışlar için.
        const raceTime = new Date(race.date).getTime();
        const isRecentFinished =
          race.status !== "cancelled" &&
          raceTime < now &&
          raceTime > now - 48 * 60 * 60 * 1000;

        if (isRecentFinished) {
          const msResults = await scrapeF1RaceResults(season, race.name).catch(() => []);
          if (msResults.length > 0) return { ...race, results: msResults };
        }

        return race;
      })
    );
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
