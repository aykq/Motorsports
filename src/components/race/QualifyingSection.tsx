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

function SegmentHeader({
  label,
  fastest,
  accent,
}: {
  label: string;
  fastest?: QualifyingDriverResult;
  accent?: string;
}) {
  const fastestDisplay = fastest
    ? (fastest.driverCode ?? fastest.driverName.split(" ").pop())
    : null;
  const fastestTime = fastest ? getBestTime(fastest) : null;

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-1.5 border-b border-border",
      accent === "gold" ? "bg-yellow-500/5" : "bg-muted/30"
    )}>
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
        isPole && "bg-yellow-500/5 border-l-4 border-yellow-500/50"
      )}
    >
      <span
        className={cn(
          "text-right font-mono font-bold shrink-0",
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
        <div className="rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 px-4 py-4 flex items-center gap-4 relative overflow-hidden">
          <span className="absolute top-2 right-3 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-500/50">
            POLE
          </span>
          <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/${slug}/drivers/${poleDriver.driverId}`}
              className="font-display text-base font-extrabold hover:underline block"
            >
              {poleDriver.driverName}
            </Link>
            <p className="text-xs text-muted-foreground">{poleDriver.team}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-lg font-bold text-yellow-500">{poleDriver.q3}</p>
          </div>
        </div>
      )}

      {q3.length > 0 && (
        <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
          <SegmentHeader label="Q3" fastest={poleDriver} accent="gold" />
          {q3.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q3" slug={slug} />
          ))}
        </div>
      )}

      {q2Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label={labels.q2Eliminated} fastest={q2Fastest} />
          {q2Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q2" slug={slug} />
          ))}
        </div>
      )}

      {q1Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden opacity-70">
          <SegmentHeader label={labels.q1Eliminated} fastest={q1Fastest} />
          {q1Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q1" slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
