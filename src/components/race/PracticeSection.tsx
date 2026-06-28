import { Zap } from "lucide-react";
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
  maxRows?: number;
}

function parseGapSec(gap: string): number {
  const s = gap.replace(/^[+\s]+/, "");
  const m = s.match(/^(\d+):(\d+\.\d+)$/);
  if (m) return parseInt(m[1]) * 60 + parseFloat(m[2]);
  return parseFloat(s) || 0;
}

export function PracticeSection({ sessionLabel, results, labels, maxRows = 20 }: Props) {
  if (!results.length) return null;

  const rows = results.slice(0, maxRows);
  const fastest = rows[0];

  const maxGapSec = Math.max(
    0,
    ...rows.filter((r) => r.position > 1 && r.gap).map((r) => parseGapSec(r.gap!))
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {sessionLabel}
        </h2>
        {fastest && (
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <Zap className="w-3 h-3" />
            <span>{fastest.driverCode ?? fastest.driverName.split(" ").pop()}</span>
            <span className="text-muted-foreground font-mono">({fastest.lapTime})</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1.5rem_1fr_4rem_4rem] text-[10px] font-medium text-muted-foreground px-3 py-1.5 border-b border-border bg-muted/30 gap-1">
          <span className="text-right">{labels.colPos}</span>
          <span className="ml-1">{labels.colDriverTeam}</span>
          <span className="text-right">{labels.colGap}</span>
          <span className="text-right font-mono">{labels.colLap}</span>
        </div>

        <div className="divide-y divide-border">
          {rows.map((r) => {
            const displayName = r.driverCode ?? r.driverName.split(" ").pop()!;
            const isP1 = r.position === 1;
            const gapRatio = r.gap && maxGapSec > 0 ? parseGapSec(r.gap) / maxGapSec : 0;
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
                    "text-right font-mono font-bold shrink-0",
                    r.position === 1 && "text-yellow-500",
                    r.position === 2 && "text-zinc-400",
                    r.position === 3 && "text-amber-600",
                    r.position > 3 && "text-muted-foreground"
                  )}
                >
                  {r.position}
                </span>
                <div className="min-w-0 ml-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{displayName}</span>
                    {isP1 && <Zap className="w-3 h-3 text-purple-400 shrink-0" />}
                  </div>
                  {r.team && (
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {r.team}
                    </span>
                  )}
                  {r.gap && r.position > 1 && maxGapSec > 0 && (
                    <div className="mt-0.5 h-[2px] rounded-full bg-muted/30 overflow-hidden w-full">
                      <div
                        className="h-full bg-muted-foreground/40 rounded-full"
                        style={{ width: `${Math.min(100, gapRatio * 100)}%` }}
                      />
                    </div>
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
