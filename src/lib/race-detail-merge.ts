import type { PracticeDriverResult, RaceDetail } from "@/types/series";

// Practice driver ids are a projection of race.results (mapped by car number).
// When race.results ids get corrected, re-derive these; only rewrite an id that
// has a canonical match, never blank one out.
export function reconcilePracticeDriverIds(
  results: PracticeDriverResult[],
  numberToDriverId: Map<number, string>
): PracticeDriverResult[] {
  let changed = false;
  const out = results.map((r) => {
    if (r.driverNumber == null) return r;
    const canonical = numberToDriverId.get(r.driverNumber);
    if (!canonical || canonical === r.driverId) return r;
    changed = true;
    return { ...r, driverId: canonical };
  });
  return changed ? out : results;
}

// [field, fetched-flag] pairs. An empty array is only trusted when the flag is
// set; otherwise it means the OpenF1 fetch failed and the stored value wins.
const GUARDED_FIELDS: ReadonlyArray<
  readonly [keyof RaceDetail, keyof RaceDetail]
> = [
  ["practice1Results", "practice1Fetched"],
  ["practice2Results", "practice2Fetched"],
  ["practice3Results", "practice3Fetched"],
  ["tireStints", "stintsFetched"],
  ["raceControl", "raceControlFetched"],
];

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

export function mergeFetchedRaceDetail(
  stored: RaceDetail | null,
  fresh: RaceDetail
): RaceDetail {
  const merged: RaceDetail = { ...fresh };
  if (!stored) return merged;

  for (const [field, flag] of GUARDED_FIELDS) {
    if (fresh[flag] === true) {
      (merged[flag] as boolean) = true;
      continue;
    }
    if (len(fresh[field]) === 0 && len(stored[field]) > 0) {
      (merged[field] as unknown) = stored[field];
    }
    if (stored[flag] === true) {
      (merged[flag] as boolean) = true;
    }
  }

  return merged;
}
