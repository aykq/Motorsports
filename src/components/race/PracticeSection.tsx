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

export function PracticeSection({ sessionLabel, results, labels, maxRows = 10 }: Props) {
  if (!results.length) return null;

  const rows = results.slice(0, maxRows);
  const fastest = rows[0];

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
            return (
              <div
                key={r.driverNumber ?? r.driverName}
                className="grid grid-cols-[1.5rem_1fr_4rem_4rem] items-center gap-1 text-xs px-3 py-2 hover:bg-accent/30 transition-colors"
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
                    {r.position === 1 && <Zap className="w-3 h-3 text-purple-400 shrink-0" />}
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
