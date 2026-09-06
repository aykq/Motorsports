import type { Race } from "@/types/series";

// An F1 field is ~20 drivers and a finished race almost always classifies 18+.
// Well below that for a completed race means the bulk paginated results fetch
// dropped rows (a page failed), not that the race was actually short.
const MIN_PLAUSIBLE_RESULTS = 15;

export function raceResultsLookIncomplete(race: Race, haveCount: number): boolean {
  if (race.status === "cancelled" || race.status === "upcoming") return false;
  return haveCount < MIN_PLAUSIBLE_RESULTS;
}

// A partial fetch must never overwrite a completed race's stored results with
// fewer. Returns `incoming` unchanged unless the stored row already had more
// results for a race that is done.
export function keepFullerResults(incoming: Race, existing: Race | undefined): Race {
  if (!existing) return incoming;
  if (existing.status !== "completed" && existing.status !== "live") return incoming;
  const existingCount = existing.results?.length ?? 0;
  const incomingCount = incoming.results?.length ?? 0;
  if (existingCount <= incomingCount) return incoming;
  return { ...incoming, results: existing.results };
}
