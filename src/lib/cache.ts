import { cache } from "react";
import { db } from "@/db";
import { cachedRaces, cachedStandings, cachedDrivers, cachedRaceDetails, cachedNews } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Race, Standing, Driver, StandingType, RaceDetail } from "@/types/series";
import { getF1DriverImage } from "@/lib/adapters/f1/driver-images";

function resolveDriverImage(slug: string, driver: Driver): string | undefined {
  if (slug === "f1") return getF1DriverImage(driver.id) ?? driver.image;
  return driver.image;
}

const TTL_MS = 30 * 60 * 1000;
const RACE_DETAIL_COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;
const RACE_DETAIL_OLD_COMPLETED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RACE_DETAIL_UPCOMING_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

// Sprint seansı live pencereleri (seri bazlı) — süre + buffer
const SPRINT_LIVE_WINDOW_MS: Record<string, number> = {
  f1:     90 * 60 * 1000,  // F1 Sprint ~30 dk
  motogp: 90 * 60 * 1000,  // MotoGP Sprint ~20 dk
  moto2:  90 * 60 * 1000,
  moto3:  90 * 60 * 1000,
  gt3:     2 * 60 * 60 * 1000, // GT3 Sprint yarışı ~1 saat
};
const DEFAULT_SPRINT_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

export function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < TTL_MS;
}

// "24 Hours of Le Mans" → 26h, "8 Hours of Bahrain" → 10h,
// "Endurance Cup" → 5h, diğerleri → 3h
function raceLiveWindowMs(raceName: string): number {
  const hoursMatch = raceName.match(/(\d+)\s*hour/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return (hours + 2) * 60 * 60 * 1000;
  }
  if (/endurance/i.test(raceName)) {
    return 5 * 60 * 60 * 1000;
  }
  return DEFAULT_LIVE_WINDOW_MS;
}

function recomputeRaceStatus(race: Race, seriesSlug?: string): Race {
  if (race.status === "cancelled") {
    // Round 900+ → manuel iptal override (Bahrain, Suudi vb.), dokunma
    if (race.round >= 900) return race;
    // Normal round ama eski bir yarış → muhtemelen API hatası "cancelled" yazdı
    // 1 haftadan yakın geçmişe güvenelim, eskileri zaman bazlı türetelim
    const raceMs = new Date(race.sessions.find((s) => s.type === "race")?.date ?? race.date).getTime();
    if (raceMs > Date.now() - 7 * 24 * 60 * 60 * 1000) return race; // son 7 gün → trust
    // 7 günden eski "cancelled" normal yarış → zaman bazlı yeniden türet
  }
  // Sonuçlar geldiyse kesin "completed" — saat penceresini geçersiz kıl
  if (race.results && race.results.length > 0) {
    return { ...race, status: "completed" };
  }

  const now = Date.now();

  // Sprint seansı aktifse "live" — ana yarıştan bağımsız kontrol
  const sprintSession = race.sessions.find((s) => s.type === "sprint");
  if (sprintSession) {
    const sprintTime = new Date(sprintSession.date).getTime();
    const sprintWindow = seriesSlug
      ? (SPRINT_LIVE_WINDOW_MS[seriesSlug] ?? DEFAULT_SPRINT_LIVE_WINDOW_MS)
      : DEFAULT_SPRINT_LIVE_WINDOW_MS;
    if (sprintTime <= now && sprintTime > now - sprintWindow) {
      return { ...race, status: "live" };
    }
  }

  const raceSession = race.sessions.find((s) => s.type === "race");
  const raceDate = new Date(raceSession?.date ?? race.date).getTime();
  const liveWindowMs = raceLiveWindowMs(race.name);
  let status: Race["status"];
  if (raceDate > now) status = "upcoming";
  else if (raceDate > now - liveWindowMs) status = "live";
  else status = "completed";
  return { ...race, status };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export const getCachedSchedule = cache(async (
  slug: string,
  season: number
): Promise<{ races: Race[]; fresh: boolean }> => {
  const rows = await db.query.cachedRaces.findMany({
    where: and(eq(cachedRaces.seriesSlug, slug), eq(cachedRaces.season, season)),
    orderBy: (t, { asc }) => [asc(t.round)],
  });
  if (!rows.length) return { races: [], fresh: false };
  const fresh = isFresh(rows[rows.length - 1].fetchedAt);
  return { races: rows.map((r) => recomputeRaceStatus(r.data as Race, r.seriesSlug)), fresh };
});

export async function setCachedSchedule(
  slug: string,
  season: number,
  races: Race[]
): Promise<void> {
  if (!races.length) return;
  await db
    .insert(cachedRaces)
    .values(
      races.map((r) => ({
        seriesSlug: slug,
        season,
        round: r.round,
        data: r as unknown as Record<string, unknown>,
      }))
    )
    .onConflictDoUpdate({
      target: [cachedRaces.seriesSlug, cachedRaces.season, cachedRaces.round],
      set: {
        data: sql`excluded.data`,
        fetchedAt: sql`now()`,
      },
    });
}

// ─── Standings ────────────────────────────────────────────────────────────────

export const getCachedStandings = cache(async (
  slug: string,
  season: number,
  type: StandingType
): Promise<{ standings: Standing[]; fresh: boolean }> => {
  const row = await db.query.cachedStandings.findFirst({
    where: and(
      eq(cachedStandings.seriesSlug, slug),
      eq(cachedStandings.season, season),
      eq(cachedStandings.type, type)
    ),
  });
  if (!row) return { standings: [], fresh: false };
  return {
    standings: row.data as Standing[],
    fresh: isFresh(row.fetchedAt),
  };
});

export async function setCachedStandings(
  slug: string,
  season: number,
  type: StandingType,
  standings: Standing[]
): Promise<void> {
  await db
    .insert(cachedStandings)
    .values({
      seriesSlug: slug,
      season,
      type,
      data: standings as unknown as Record<string, unknown>[],
    })
    .onConflictDoUpdate({
      target: [cachedStandings.seriesSlug, cachedStandings.season, cachedStandings.type],
      set: {
        data: sql`excluded.data`,
        fetchedAt: sql`now()`,
      },
    });
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export const getCachedDrivers = cache(async (
  slug: string
): Promise<{ drivers: Driver[]; fresh: boolean }> => {
  const rows = await db.query.cachedDrivers.findMany({
    where: eq(cachedDrivers.seriesSlug, slug),
  });
  if (!rows.length) return { drivers: [], fresh: false };
  const fresh = isFresh(rows[rows.length - 1].fetchedAt);
  const drivers = rows
    .map((r) => {
      const d = r.data as Driver;
      return { ...d, image: resolveDriverImage(r.seriesSlug, d) };
    })
    .sort((a, b) => (a.standingsPosition ?? 999) - (b.standingsPosition ?? 999));
  return { drivers, fresh };
});

export async function setCachedDrivers(
  slug: string,
  drivers: Driver[]
): Promise<void> {
  if (!drivers.length) return;
  await db
    .insert(cachedDrivers)
    .values(
      drivers.map((d) => ({
        seriesSlug: slug,
        driverId: d.id,
        data: d as unknown as Record<string, unknown>,
      }))
    )
    .onConflictDoUpdate({
      target: [cachedDrivers.seriesSlug, cachedDrivers.driverId],
      set: {
        data: sql`excluded.data`,
        fetchedAt: sql`now()`,
      },
    });
}

// ─── Race (single round) ──────────────────────────────────────────────────────

export async function getCachedRaceByRound(
  slug: string,
  season: number,
  round: number
): Promise<Race | null> {
  const row = await db.query.cachedRaces.findFirst({
    where: and(
      eq(cachedRaces.seriesSlug, slug),
      eq(cachedRaces.season, season),
      eq(cachedRaces.round, round)
    ),
  });
  return row ? recomputeRaceStatus(row.data as Race, row.seriesSlug) : null;
}

// ─── Race Detail ──────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const RACE_DETAIL_ACTIVE_WEEKEND_TTL_MS = 15 * 60 * 1000;

export async function getCachedRaceDetail(
  slug: string,
  season: number,
  round: number,
  isCompleted: boolean,
  raceDate?: string,
  activeWeekend?: boolean,
): Promise<RaceDetail | null> {
  try {
    const row = await db.query.cachedRaceDetails.findFirst({
      where: and(
        eq(cachedRaceDetails.seriesSlug, slug),
        eq(cachedRaceDetails.season, season),
        eq(cachedRaceDetails.round, round)
      ),
    });
    if (!row) return null;
    const isOldRace = isCompleted && raceDate
      ? Date.now() - new Date(raceDate).getTime() > SEVEN_DAYS_MS
      : false;
    const ttl = isOldRace
      ? RACE_DETAIL_OLD_COMPLETED_TTL_MS
      : isCompleted
        ? RACE_DETAIL_COMPLETED_TTL_MS
        : activeWeekend
          ? RACE_DETAIL_ACTIVE_WEEKEND_TTL_MS
          : RACE_DETAIL_UPCOMING_TTL_MS;
    if (Date.now() - row.fetchedAt.getTime() > ttl) return null;
    return row.data as RaceDetail;
  } catch {
    return null;
  }
}

export async function getRaceDetailRaw(
  slug: string,
  season: number,
  round: number,
): Promise<RaceDetail | null> {
  try {
    const row = await db.query.cachedRaceDetails.findFirst({
      where: and(
        eq(cachedRaceDetails.seriesSlug, slug),
        eq(cachedRaceDetails.season, season),
        eq(cachedRaceDetails.round, round)
      ),
    });
    return row ? (row.data as RaceDetail) : null;
  } catch {
    return null;
  }
}

export async function setCachedRaceDetail(
  slug: string,
  season: number,
  round: number,
  detail: RaceDetail
): Promise<void> {
  try {
    await db
      .insert(cachedRaceDetails)
      .values({
        seriesSlug: slug,
        season,
        round,
        data: detail as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [cachedRaceDetails.seriesSlug, cachedRaceDetails.season, cachedRaceDetails.round],
        set: {
          data: sql`excluded.data`,
          fetchedAt: sql`now()`,
        },
      });
  } catch {
    // non-fatal — page still works without caching
  }
}

// ─── News ─────────────────────────────────────────────────────────────────────

export type NewsItem = typeof cachedNews.$inferSelect;

export const getCachedNews = cache(async (
  slug: string,
  limit = 10
): Promise<NewsItem[]> => {
  return db.query.cachedNews.findMany({
    where: eq(cachedNews.seriesSlug, slug),
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
    limit,
  });
});

export const getAllCachedNews = cache(async (limit = 30): Promise<NewsItem[]> => {
  return db.query.cachedNews.findMany({
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
    limit,
  });
});

export async function getCachedNewsById(id: string): Promise<NewsItem | null> {
  const row = await db.query.cachedNews.findFirst({
    where: eq(cachedNews.id, id),
  });
  return row ?? null;
}
