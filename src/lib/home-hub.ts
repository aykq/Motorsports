import type { Race, Standing, Driver } from "@/types/series";

function getRaceSessionDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

export function getNextRace<T extends Race>(races: T[]): T | null {
  const upcoming = races.filter((r) => r.status === "upcoming" || r.status === "live");
  if (upcoming.length === 0) return null;
  return upcoming.reduce((soonest, race) =>
    getRaceSessionDate(race).getTime() < getRaceSessionDate(soonest).getTime() ? race : soonest
  );
}

export function getLastCompletedRace<T extends Race>(races: T[]): T | null {
  const completed = races.filter((r) => r.status === "completed" && (r.results?.length ?? 0) > 0);
  if (completed.length === 0) return null;
  return completed.reduce((latest, race) =>
    getRaceSessionDate(race).getTime() > getRaceSessionDate(latest).getTime() ? race : latest
  );
}

export interface TopDriverEntry {
  driver: Driver;
  points: number;
  position: number;
}

/**
 * `driverStandings` must already be sorted by championship position (ascending) —
 * this function only slices the first `limit` entries, it does not sort them.
 * Callers like `getCachedStandings` are expected to return pre-sorted data.
 */
export function getTopDriversWithPoints(
  driverStandings: Standing[],
  drivers: Driver[],
  limit = 5
): TopDriverEntry[] {
  return driverStandings
    .slice(0, limit)
    .map((s): TopDriverEntry | null => {
      const driver = drivers.find((d) => d.id === s.driver?.id) ?? s.driver ?? null;
      if (!driver) return null;
      return { driver, points: s.points, position: s.position };
    })
    .filter((entry): entry is TopDriverEntry => entry !== null);
}
