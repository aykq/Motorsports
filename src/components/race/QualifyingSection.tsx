import Link from "next/link";
import { Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualifyingDriverResult } from "@/types/series";

export interface QualifyingLabels {
  qualifyingResults: string;
  q2Eliminated: string;
  q1Eliminated: string;
}

interface Props {
  results: QualifyingDriverResult[];
  labels: QualifyingLabels;
  slug: string;
}

function getBestTime(r: QualifyingDriverResult): string | undefined {
  return r.q3 ?? r.q2 ?? r.q1;
}

function SegmentHeader({ label, fastest }: { label: string; fastest?: QualifyingDriverResult }) {
  const fastestDisplay = fastest
    ? (fastest.driverCode ?? fastest.driverName.split(" ").pop())
    : null;
  const fastestTime = fastest ? getBestTime(fastest) : null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      {fastestDisplay && fastestTime && (
        <div className="flex items-center gap-1 text-[10px] text-purple-400">
          <Zap className="w-3 h-3" />
          <span>{fastestDisplay}</span>
          <span className="text-muted-foreground">({fastestTime})</span>
        </div>
      )}
    </div>
  );
}

function QualifyingRow({
  result,
  timeKey,
  slug,
}: {
  result: QualifyingDriverResult;
  timeKey: "q1" | "q2" | "q3";
  slug: string;
}) {
  const time = result[timeKey];
  const isPole = result.position === 1;
  const displayName = result.driverCode ?? result.driverName.split(" ").pop()!;

  return (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_1fr_5rem] items-center gap-1 text-xs px-3 py-2 hover:bg-accent/30 transition-colors border-b border-border last:border-0",
        isPole && "bg-yellow-500/5"
      )}
    >
      <span
        className={cn(
          "text-right font-bold shrink-0",
          result.position === 1 && "text-yellow-500",
          result.position === 2 && "text-zinc-400",
          result.position === 3 && "text-amber-600",
          result.position > 3 && "text-muted-foreground"
        )}
      >
        {result.position}
      </span>
      <div className="min-w-0 px-1">
        <div className="flex items-center gap-1">
          <Link
            href={`/${slug}/drivers/${result.driverId}`}
            className="font-medium truncate hover:underline"
          >
            {displayName}
          </Link>
          {isPole && <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />}
        </div>
        <span className="text-[10px] text-muted-foreground truncate block">{result.team}</span>
      </div>
      <span className={cn("text-right font-mono text-[11px] shrink-0", isPole && "text-yellow-500 font-semibold")}>
        {time ?? "—"}
      </span>
    </div>
  );
}

export function QualifyingSection({ results, labels, slug }: Props) {
  if (!results.length) return null;

  const q3 = results.filter((r) => r.q3 != null);
  const q2Eliminated = results.filter((r) => r.q2 != null && r.q3 == null);
  const q1Eliminated = results.filter((r) => r.q1 != null && r.q2 == null);

  const poleDriver = q3[0];
  const q2Fastest = q2Eliminated[0];
  const q1Fastest = q1Eliminated[0];

  return (
    <div className="space-y-3">
      {poleDriver && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-3">
          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/${slug}/drivers/${poleDriver.driverId}`}
              className="text-sm font-bold hover:underline"
            >
              {poleDriver.driverName}
            </Link>
            <p className="text-[10px] text-muted-foreground">{poleDriver.team}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Pole</p>
            <p className="font-mono text-sm font-semibold text-yellow-500">{poleDriver.q3}</p>
          </div>
        </div>
      )}

      {q3.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label="Q3" fastest={poleDriver} />
          {q3.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q3" slug={slug} />
          ))}
        </div>
      )}

      {q2Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label={labels.q2Eliminated}/>
          {q2Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q2" slug={slug} />
          ))}
        </div>
      )}

      {q1Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label={labels.q1Eliminated} />
          {q1Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q1" slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
