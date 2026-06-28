import Link from "next/link";
import { Trophy } from "lucide-react";
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

function SegmentHeader({ label, accent }: { label: string; accent?: "gold" }) {
  return (
    <div className={cn(
      "flex items-center px-3 py-1.5 border-b border-border",
      accent === "gold" ? "bg-yellow-500/5" : "bg-muted/30"
    )}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
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
        "grid grid-cols-[2rem_1fr_5.5rem] items-center gap-1 text-xs px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-0",
        isPole && "bg-yellow-500/5 border-l-4 border-yellow-500/50"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 self-center mx-auto",
          result.position === 1 && "bg-yellow-500/15 text-yellow-500",
          result.position === 2 && "bg-zinc-500/15 text-zinc-400",
          result.position === 3 && "bg-amber-700/15 text-amber-600",
          result.position > 3 && "text-muted-foreground"
        )}
      >
        {result.position}
      </div>
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

  return (
    <div className="space-y-3">
      {q3.length > 0 && (
        <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
          <SegmentHeader label="Q3" accent="gold" />
          {q3.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q3" slug={slug} />
          ))}
        </div>
      )}

      {q2Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label={labels.q2Eliminated} />
          {q2Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q2" slug={slug} />
          ))}
        </div>
      )}

      {q1Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden opacity-70">
          <SegmentHeader label={labels.q1Eliminated} />
          {q1Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q1" slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
