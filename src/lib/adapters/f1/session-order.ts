import type { QualifyingDriverResult } from "@/types/series";
import { logError } from "@/lib/error-log";

type Ranked = { position: number; driverId?: string; driverCode?: string; driverNumber?: number };

export function hasConsistentPositions(rows: ReadonlyArray<{ position: number }>): boolean {
  return rows.every((r, i) => r.position === i + 1);
}

function lapMs(time: string | undefined): number | null {
  const m = time?.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000;
}

function renumber<T extends Ranked>(rows: T[]): T[] {
  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

function sameDriver(a: Ranked, b: Ranked): boolean {
  return (
    (!!a.driverId && a.driverId === b.driverId) ||
    (!!a.driverCode && a.driverCode === b.driverCode) ||
    (a.driverNumber != null && a.driverNumber === b.driverNumber)
  );
}

export function reorderByReference<T extends Ranked>(rows: T[], reference: Ranked[]): T[] {
  const rank = (r: T) => {
    const i = reference.findIndex((ref) => sameDriver(r, ref));
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

export function rankByLapTime<T extends Ranked & { lapTime: string }>(rows: T[]): T[] {
  const ms = (r: T) => lapMs(r.lapTime) ?? Infinity;
  return renumber([...rows].sort((a, b) => ms(a) - ms(b)));
}

export function renumberByPosition<T extends Ranked>(rows: T[]): T[] {
  return renumber([...rows].sort((a, b) => a.position - b.position));
}

export async function ensureOrder<T extends Ranked>(
  rows: T[],
  label: string,
  fallback: (rows: T[]) => T[],
  reference?: () => Promise<Ranked[]>
): Promise<T[]> {
  if (hasConsistentPositions(rows)) return rows;
  const ref = reference ? await reference().catch(() => []) : [];
  await logError({
    source: "f1/session-order",
    severity: "warning",
    message: `${label}: positions are inconsistent; reordered by ${ref.length ? "reference source" : "own data"}`,
  });
  return ref.length ? reorderByReference(rows, ref) : fallback(rows);
}
