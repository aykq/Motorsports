import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualifyingDriverResult } from "@/types/series";

export interface QualifyingLabels {
  qualifyingResults: string;
  q2Eliminated: string;
  q1Eliminated: string;
  colPos: string;
  colDriverTeam: string;
  colGap: string;
  colLap: string;
}

interface Props {
  results: QualifyingDriverResult[];
  labels: QualifyingLabels;
  slug: string;
}

// Ergast/Jolpica lap time formatı "M:SS.mmm" (ör. "1:31.824"); bazı kısa pistlerde
// dakikasız "SS.mmm" da olabilir.
export function parseLapTimeMs(time: string): number | null {
  const parts = time.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    return Number.isNaN(mins) || Number.isNaN(secs) ? null : (mins * 60 + secs) * 1000;
  }
  const secs = parseFloat(time);
  return Number.isNaN(secs) ? null : secs * 1000;
}

// PracticeSection'daki gap formatıyla aynı (nokta ondalık, "+0.245") — uygulama genelinde
// tek bir tur-farkı formatı olsun diye.
export function formatGapToLeader(diffMs: number): string {
  return `+${(diffMs / 1000).toFixed(3)}`;
}

function SegmentHeader({
  label,
  accent,
  columnLabels,
}: {
  label: string;
  accent?: "gold";
  columnLabels: Pick<QualifyingLabels, "colPos" | "colDriverTeam" | "colGap" | "colLap">;
}) {
  return (
    <>
      <div className={cn(
        "flex items-center px-3 py-1.5 border-b border-border",
        accent === "gold" ? "bg-yellow-500/5" : "bg-muted/30"
      )}>
        <span className="font-display text-[10px] font-semibold text-muted-foreground tracking-wide">
          {label}
        </span>
      </div>
      <div className={cn(
        "grid grid-cols-[2rem_1fr_4rem_4rem] font-display text-[10px] font-medium text-muted-foreground px-3 py-1 border-b border-border gap-1",
        accent === "gold" ? "bg-yellow-500/5" : "bg-muted/30"
      )}>
        <span className="text-center">{columnLabels.colPos}</span>
        <span className="ml-1">{columnLabels.colDriverTeam}</span>
        <span className="text-right">{columnLabels.colGap}</span>
        <span className="text-right font-mono">{columnLabels.colLap}</span>
      </div>
    </>
  );
}

function QualifyingRow({
  result,
  timeKey,
  slug,
  poleMs,
}: {
  result: QualifyingDriverResult;
  timeKey: "q1" | "q2" | "q3";
  slug: string;
  poleMs: number | null;
}) {
  const time = result[timeKey];
  const timeMs = time ? parseLapTimeMs(time) : null;
  const isPoleTime = poleMs != null && timeMs != null && timeMs <= poleMs;
  const gap = !time || timeMs == null || poleMs == null || isPoleTime
    ? null
    : formatGapToLeader(timeMs - poleMs);
  const isPole = result.position === 1;
  const displayName = result.driverCode ?? result.driverName.split(" ").pop()!;

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_1fr_4rem_4rem] items-center gap-1 text-xs px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-0",
        isPole && "bg-yellow-500/5 border-l-4 border-yellow-500/50"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold tabular-nums shrink-0 self-center mx-auto",
          result.position === 1 && "bg-yellow-500/15 text-[var(--pos-gold)]",
          result.position === 2 && "bg-zinc-500/15 text-[var(--pos-silver)]",
          result.position === 3 && "bg-amber-700/15 text-[var(--pos-bronze)]",
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
          {isPole && <Trophy className="w-3 h-3 text-[var(--pos-gold)] shrink-0" />}
        </div>
        <span className="text-[10px] text-muted-foreground truncate block">{result.team}</span>
      </div>
      <span className="text-right text-[10px] text-muted-foreground shrink-0 font-mono">
        {gap ?? "—"}
      </span>
      <span className={cn("text-right font-mono text-[11px] shrink-0", isPole && "text-[var(--pos-gold)] font-semibold")}>
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

  // Tek referans: pole zamanı (Q3'ün en hızlısı). Herkes buna göre "+fark" gösterir,
  // sadece pole kendi ham zamanını gösterir — Q1/Q2'de elenenler dahil.
  const poleMs = q3[0]?.q3 ? parseLapTimeMs(q3[0].q3) : null;

  return (
    <div className="space-y-3">
      {q3.length > 0 && (
        <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
          <SegmentHeader label="Q3" accent="gold" columnLabels={labels} />
          {q3.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q3" slug={slug} poleMs={poleMs} />
          ))}
        </div>
      )}

      {q2Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <SegmentHeader label={labels.q2Eliminated} columnLabels={labels} />
          {q2Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q2" slug={slug} poleMs={poleMs} />
          ))}
        </div>
      )}

      {q1Eliminated.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden opacity-70">
          <SegmentHeader label={labels.q1Eliminated} columnLabels={labels} />
          {q1Eliminated.map((r) => (
            <QualifyingRow key={r.driverId} result={r} timeKey="q1" slug={slug} poleMs={poleMs} />
          ))}
        </div>
      )}
    </div>
  );
}
