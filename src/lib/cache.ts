import { db } from "@/db";
import { cachedRaces, cachedStandings, cachedDrivers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Race, Standing, Driver, StandingType } from "@/types/series";

const TTL_MS = 30 * 60 * 1000;

export function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < TTL_MS;
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
  return { races: rows.map((r) => r.data as Race), fresh };
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
  return { drivers: rows.map((r) => r.data as Driver), fresh };
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
