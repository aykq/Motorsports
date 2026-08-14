import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PracticeDriverResult } from "@/types/series";

export interface PracticeLabels {
  colPos: string;
  colDriverTeam: string;
  colGap: string;
  colLap: string;
}

interface Props {
  sessionLabel: string;
  results: PracticeDriverResult[];
  labels: PracticeLabels;
  slug: string;
  maxRows?: number; // varsayılan: tüm sürücüler
}

export function PracticeSection({ sessionLabel, results, labels, slug, maxRows }: Props) {
  if (!results.length) return null;

  const rows = maxRows !== undefined ? results.slice(0, maxRows) : results;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
        {sessionLabel}
      </h2>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1.5rem_1fr_4rem_4rem] font-display text-[10px] font-medium text-muted-foreground px-3 py-1.5 border-b border-border bg-muted/30 gap-1">
          <span className="text-right">{labels.colPos}</span>
          <span className="ml-1">{labels.colDriverTeam}</span>
          <span className="text-right">{labels.colGap}</span>
          <span className="text-right font-mono">{labels.colLap}</span>
        </div>

        <div className="divide-y divide-border">
          {rows.map((r) => {
            const displayName = r.driverCode ?? r.driverName.split(" ").pop()!;
            const isP1 = r.position === 1;
            return (
              <div
                key={r.driverNumber ?? r.driverName}
                className={cn(
                  "grid grid-cols-[1.5rem_1fr_4rem_4rem] items-center gap-1 text-xs px-3 py-2 hover:bg-accent/30 transition-colors",
                  isP1 && "bg-purple-500/5 border-l-2 border-purple-500/40"
                )}
              >
                <span
                  className={cn(
                    "text-right font-mono font-bold tabular-nums shrink-0",
                    r.position === 1 && "text-[var(--pos-gold)]",
                    r.position === 2 && "text-[var(--pos-silver)]",
                    r.position === 3 && "text-[var(--pos-bronze)]",
                    r.position > 3 && "text-muted-foreground"
                  )}
                >
                  {r.position}
                </span>
                <div className="min-w-0 ml-1">
                  <div className="flex items-center gap-1">
                    {r.driverId ? (
                      <Link
                        href={`/${slug}/drivers/${r.driverId}`}
                        className="font-medium truncate hover:underline"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span className="font-medium truncate">{displayName}</span>
                    )}
                  </div>
                  {r.team && (
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {r.team}
                    </span>
                  )}
                </div>
                <span className="text-right text-[10px] text-muted-foreground shrink-0 font-mono">
                  {r.gap ?? "—"}
                </span>
                <span className="text-right font-mono text-[11px] shrink-0">{r.lapTime}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
