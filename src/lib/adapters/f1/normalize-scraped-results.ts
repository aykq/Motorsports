import type { Driver, RaceResult } from "@/types/series";

// motorsport.com uses its own driver slugs (`george-russell`); the rest of the
// app keys on Jolpica ids (`russell`). Map scraped results onto the season roster
// by car number so both sources agree.
export function normalizeScrapedResults(
  results: RaceResult[],
  roster: Driver[]
): RaceResult[] {
  const byNumber = new Map<number, Driver>();
  for (const d of roster) {
    if (d.number != null) byNumber.set(d.number, d);
  }

  return results.map((r) => {
    const d = r.driverNumber != null ? byNumber.get(r.driverNumber) : undefined;
    if (!d) return r;
    return {
      ...r,
      driverId: d.id,
      driverName: `${d.firstName} ${d.lastName}`.trim(),
      driverCode: d.code ?? r.driverCode,
      team: d.team ?? r.team,
      teamId: d.teamId ?? r.teamId,
    };
  });
}
