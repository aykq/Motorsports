import type { QualifyingDriverResult } from "@/types/series";

export function hasConsistentPositions(rows: ReadonlyArray<{ position: number }>): boolean {
  return rows.every((r, i) => r.position === i + 1);
}

function lapMs(time: string | undefined): number | null {
  const m = time?.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000;
}

function renumber(rows: QualifyingDriverResult[]): QualifyingDriverResult[] {
  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

export function reorderByReference(
  rows: QualifyingDriverResult[],
  reference: QualifyingDriverResult[]
): QualifyingDriverResult[] {
  const rank = (r: QualifyingDriverResult) => {
    const i = reference.findIndex(
      (ref) => ref.driverId === r.driverId || (!!r.driverCode && ref.driverCode === r.driverCode)
    );
    return i === -1 ? Infinity : i;
  };
  return renumber([...rows].sort((a, b) => rank(a) - rank(b)));
}

export function rankByTimes(rows: QualifyingDriverResult[]): QualifyingDriverResult[] {
  const key = (r: QualifyingDriverResult): [number, number] => {
    for (const [segment, time] of [[3, r.q3], [2, r.q2], [1, r.q1]] as const) {
      const ms = lapMs(time);
      if (ms !== null) return [-segment, ms];
    }
    return [0, Infinity];
  };
  return renumber(
    [...rows].sort((a, b) => {
      const [sa, ta] = key(a);
      const [sb, tb] = key(b);
      return sa - sb || ta - tb;
    })
  );
}
