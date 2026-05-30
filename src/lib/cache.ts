import { db } from "@/db";
import { cachedRaces, cachedStandings, cachedDrivers, cachedRaceDetails } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Race, Standing, Driver, StandingType, RaceDetail } from "@/types/series";
import { getF1DriverImage } from "@/lib/adapters/f1/driver-images";

function resolveDriverImage(slug: string, driver: Driver): string | undefined {
  if (slug === "f1") return getF1DriverImage(driver.id) ?? driver.image;
  return driver.image;
}

const TTL_MS = 30 * 60 * 1000;
const RACE_DETAIL_COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;
const RACE_DETAIL_UPCOMING_TTL_MS = 2 * 60 * 60 * 1000;
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < TTL_MS;
}

function recomputeRaceStatus(race: Race): Race {
  if (race.status === "cancelled") return race;
  const raceSession = race.sessions.find((s) => s.type === "race");
  const raceDate = new Date(raceSession?.date ?? race.date).getTime();
  const now = Date.now();
  let status: Race["status"];
  if (raceDate > now) status = "upcoming";
  else if (raceDate > now - LIVE_WINDOW_MS) status = "live";
  else status = "completed";
  return { ...race, status };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function getCachedSchedule(
  slug: string,
  season: number
): Promise<{ races: Race[]; fresh: boolean }> {
  const rows = await db.query.cachedRaces.findMany({
    where: and(eq(cachedRaces.seriesSlug, slug), eq(cachedRaces.season, season)),
    orderBy: (t, { asc }) => [asc(t.round)],
  });
  if (!rows.length) return { races: [], fresh: false };
  const fresh = isFresh(rows[rows.length - 1].fetchedAt);
  return { races: rows.map((r) => recomputeRaceStatus(r.data as Race)), fresh };
}

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

export async function getCachedStandings(
  slug: string,
  season: number,
  type: StandingType
): Promise<{ standings: Standing[]; fresh: boolean }> {
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
}

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

export async function getCachedDrivers(
  slug: string
): Promise<{ drivers: Driver[]; fresh: boolean }> {
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
}

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
  return row ? recomputeRaceStatus(row.data as Race) : null;
}

// ─── Race Detail ──────────────────────────────────────────────────────────────

export async function getCachedRaceDetail(
  slug: string,
  season: number,
  round: number,
  isCompleted: boolean
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
    const ttl = isCompleted ? RACE_DETAIL_COMPLETED_TTL_MS : RACE_DETAIL_UPCOMING_TTL_MS;
    if (Date.now() - row.fetchedAt.getTime() > ttl) return null;
    return row.data as RaceDetail;
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
