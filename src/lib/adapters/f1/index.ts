import type { SeriesAdapter, Race, Standing, Driver, Circuit, StandingType } from "@/types/series";
import {
  jolpicaFetchSchedule,
  jolpicaFetchResults,
  jolpicaFetchRaceResults,
  jolpicaFetchDriverStandings,
  jolpicaFetchTeamStandings,
  jolpicaFetchDrivers,
  jolpicaFetchCircuits,
} from "./jolpica";
import { fetchLatestOpenF1Drivers } from "./openf1";
import { getF1DriverImage } from "./driver-images";
import { scrapeF1RaceResults } from "./motorsport-com-scraper";
import { normalizeScrapedResults } from "./normalize-scraped-results";
import { raceResultsLookIncomplete } from "./results-completeness";
import { ensureOrder, renumberByPosition } from "./session-order";

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
    const [races, resultsMap, roster] = await Promise.all([
      jolpicaFetchSchedule(season),
      jolpicaFetchResults(season),
      jolpicaFetchDrivers(season).catch(() => [] as Driver[]),
    ]);

    const now = Date.now();
    // Only backfill individual rounds when the bulk fetch partly succeeded — a
    // total Jolpica outage shouldn't fan out into a request per race.
    const bulkPartlyWorked = resultsMap.size > 0;
    return Promise.all(
      races.map(async (race) => {
        let jolpicaResults = resultsMap.get(race.round) ?? [];

        // The bulk paginated results fetch drops rows when a page fails; a
        // completed race with a near-empty result set means that, not a short
        // race. Backfill from the single-round endpoint, which doesn't paginate.
        if (bulkPartlyWorked && raceResultsLookIncomplete(race, jolpicaResults.length)) {
          const single = await jolpicaFetchRaceResults(season, race.round).catch(() => []);
          if (single.length > jolpicaResults.length) jolpicaResults = single;
        }

        // Jolpica sonuçları yayınlamadan önce (genellikle birkaç saat) motorsport.com
        // kullan — sadece son 48 saatte bitmiş, iptal olmayan yarışlar için.
        const raceTime = new Date(race.date).getTime();
        const isRecentFinished =
          race.status !== "cancelled" &&
          raceTime < now &&
          raceTime > now - 48 * 60 * 60 * 1000;
        const scrape = async () => normalizeScrapedResults(await scrapeF1RaceResults(season, race.name, roster), roster);

        if (jolpicaResults.length) {
          const results = await ensureOrder(
            jolpicaResults,
            `${season}/${race.round} race jolpica`,
            renumberByPosition,
            isRecentFinished ? scrape : undefined
          );
          return { ...race, results };
        }

        if (isRecentFinished) {
          const msResults = await scrape().catch(() => []);
          if (msResults.length > 0) {
            return { ...race, results: await ensureOrder(msResults, `${season}/${race.round} race mscom`, renumberByPosition) };
          }
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
