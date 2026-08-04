import fs from "node:fs/promises";
import path from "node:path";
import { getAdapter } from "@/lib/adapters";
import {
  getCachedSchedule,
  setCachedSchedule,
  setCachedStandings,
  setCachedDrivers,
  setCachedCircuitData,
  getCachedCircuitData,
} from "@/lib/cache";
import { syncRaceDetails } from "@/lib/race-detail";
import { F1_RACE_URL_SLUGS, scrapeF1CircuitData } from "@/lib/adapters/f1/circuit-scraper";
import {
  WIKIPEDIA_CIRCUIT_TITLES,
  scrapeCircuitHistory,
  scrapeWikipediaCircuitSpecs,
} from "@/lib/adapters/f1/circuit-history-scraper";
import { summarizeCircuitHistory } from "@/lib/gemini";
import type { Race, Driver, ScrapedCircuitData } from "@/types/series";

const MOTO_SERIES = new Set(["motogp", "moto2", "moto3"]);

async function downloadDriverImages(drivers: Driver[], slug: string): Promise<Driver[]> {
  if (!MOTO_SERIES.has(slug)) return drivers;

  const dir = path.join(process.cwd(), "public", "motogp", "drivers");
  await fs.mkdir(dir, { recursive: true });

  return Promise.all(
    drivers.map(async (driver) => {
      if (!driver.image?.startsWith("http")) return driver;

      try {
        const ext = driver.image.match(/\.(png|jpe?g|webp)(?:[?#]|$)/i)?.[1]?.toLowerCase() ?? "jpg";
        const filename = `${driver.id}.${ext}`;
        const filePath = path.join(dir, filename);

        // Already downloaded — return local path immediately
        try {
          await fs.access(filePath);
          return { ...driver, image: `/motogp/drivers/${filename}` };
        } catch {}

        const res = await fetch(driver.image, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
            "Referer": "https://www.motogp.com/",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return driver;

        await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
        return { ...driver, image: `/motogp/drivers/${filename}` };
      } catch {
        return driver;
      }
    })
  );
}

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

export async function syncScheduleOnly(slug: string, season: number): Promise<void> {
  const adapter = getAdapter(slug);
  if (!adapter) return;
  const races = await adapter.fetchSchedule(season);
  const racesWithCancelled = await mergeRemovedAsCancelled(slug, season, races);
  await setCachedSchedule(slug, season, racesWithCancelled);
}

// ── Admin panelindeki kategori-bazlı sync butonları için: her biri tek bir veri
// türünü, sadece verilen sezon için tazeler. Geçmiş sezonlar buraya asla otomatik
// bağlanmaz — sadece elle çalıştırılan bir kerelik backfill script'leriyle girer.

export async function syncDriverStandingsOnly(slug: string, season: number): Promise<number> {
  const adapter = getAdapter(slug);
  if (!adapter) return 0;
  const standings = await adapter.fetchStandings(season, "driver");
  await setCachedStandings(slug, season, "driver", standings);
  return standings.length;
}

export async function syncTeamStandingsOnly(slug: string, season: number): Promise<number> {
  const adapter = getAdapter(slug);
  if (!adapter) return 0;
  const standings = await adapter.fetchStandings(season, "team");
  await setCachedStandings(slug, season, "team", standings);
  return standings.length;
}

export async function syncDriversOnly(slug: string, season: number): Promise<number> {
  const adapter = getAdapter(slug);
  if (!adapter) return 0;
  const drivers = await downloadDriverImages(await adapter.fetchDrivers(season), slug);
  await setCachedDrivers(slug, drivers);
  return drivers.length;
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
    const drivers = await downloadDriverImages(driversResult.value, slug);
    await setCachedDrivers(slug, drivers);
    driversCount = drivers.length;
  } else {
    errors.push(`drivers: ${driversResult.reason}`);
  }

  return { slug, season, racesCount, driversCount, raceDetailsSynced, errors };
}

const CIRCUIT_SCRAPE_DELAY_MS = 500;
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CircuitSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

/**
 * f1.com'un pist sayfalarını (Circuit Length/Laps/Race Distance/Fastest Lap/görsel)
 * tek tek scrape edip cached_circuit tablosuna yazar. Sadece F1 için — diğer
 * serilerde bu veri kaynağı yok. Ayrı, düşük sıklıkta bir cron job'dan tetiklenmesi
 * amaçlanıyor (bkz. docs/cron-setup.md), 6 saatlik tam sync'e dahil değil —
 * 23 sayfayı taramak zaman alıyor ve f1.com'u sık taramak istemiyoruz.
 */
export async function syncCircuitData(season: number): Promise<CircuitSyncResult> {
  const circuitIds = Array.from(
    new Set([...Object.keys(F1_RACE_URL_SLUGS), ...Object.keys(WIKIPEDIA_CIRCUIT_TITLES)])
  );
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  for (const circuitId of circuitIds) {
    try {
      const existing = await getCachedCircuitData("f1", circuitId);

      const specsData = F1_RACE_URL_SLUGS[circuitId]
        ? await scrapeF1CircuitData(circuitId, season)
        : null;

      // No f1.com page for this circuit (dropped from the calendar, or never had one) —
      // fall back to Wikipedia's infobox for length/corners/lap record.
      const wikiSpecs =
        !F1_RACE_URL_SLUGS[circuitId] && WIKIPEDIA_CIRCUIT_TITLES[circuitId]
          ? await scrapeWikipediaCircuitSpecs(WIKIPEDIA_CIRCUIT_TITLES[circuitId])
          : null;

      let history = existing?.history ?? null;
      try {
        const historyScrape = await scrapeCircuitHistory(circuitId);
        if (historyScrape) {
          if (historyScrape.sourceHash !== history?.sourceHash) {
            const summary = await summarizeCircuitHistory(historyScrape.circuitName, historyScrape.rawText);
            if (summary) {
              history = {
                tr: summary.tr,
                en: summary.en,
                sourceHash: historyScrape.sourceHash,
                links: historyScrape.links,
                updatedAt: new Date().toISOString(),
              };
            } else {
              errors.push(`${circuitId}: history summarize failed (Gemini)`);
              history = history ? { ...history, links: historyScrape.links } : null;
            }
          } else if (history) {
            // Hash unchanged implies history is already set (see condition above —
            // sourceHash only matches an existing value when one exists), but TS can't
            // narrow through the optional-chaining comparison, so guard explicitly.
            history = { ...history, links: historyScrape.links };
          }
        }
      } catch (err) {
        errors.push(`${circuitId}: history scrape failed — ${err}`);
      }

      const merged: ScrapedCircuitData = {
        lengthKm: specsData?.lengthKm ?? wikiSpecs?.lengthKm ?? existing?.lengthKm ?? null,
        officialLaps: specsData?.officialLaps ?? existing?.officialLaps ?? null,
        raceDistanceKm: specsData?.raceDistanceKm ?? existing?.raceDistanceKm ?? null,
        firstGrandPrix: specsData?.firstGrandPrix ?? existing?.firstGrandPrix ?? null,
        fastestLap: specsData?.fastestLap ?? wikiSpecs?.fastestLap ?? existing?.fastestLap ?? null,
        trackImageUrl: specsData?.trackImageUrl ?? existing?.trackImageUrl ?? null,
        corners: wikiSpecs?.corners ?? existing?.corners ?? null,
        history,
      };

      const hasAnyData =
        merged.lengthKm !== null ||
        merged.officialLaps !== null ||
        merged.raceDistanceKm !== null ||
        merged.firstGrandPrix !== null ||
        merged.fastestLap !== null ||
        merged.trackImageUrl !== null ||
        merged.corners != null ||
        merged.history != null;

      if (hasAnyData) {
        await setCachedCircuitData("f1", circuitId, merged);
        synced++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`${circuitId}: ${err}`);
    }
    await sleep(CIRCUIT_SCRAPE_DELAY_MS);
  }

  return { synced, skipped, errors };
}
