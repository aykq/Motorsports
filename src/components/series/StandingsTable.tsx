import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StandingsRow {
  position: number;
  name: string;
  sub: string;
  href: string;
  points: number;
}

export interface StandingsTableProps {
  color: string;
  rows: StandingsRow[];
  posLabel?: string;
  nameLabel?: string;
  ptsLabel?: string;
}

export function StandingsTable({ color, rows, posLabel = "Pos", nameLabel = "Name", ptsLabel = "Pts" }: StandingsTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center px-4 py-2 border-b border-border font-display text-[10px] text-muted-foreground tracking-wide">
          <div className="w-8">{posLabel}</div>
          <div className="flex-1">{nameLabel}</div>
          <div>{ptsLabel}</div>
        </div>
        {rows.map((s, i) => (
          <Link
            key={`${s.position}-${s.name}-${i}`}
            href={s.href}
            className={cn(
              "flex items-center px-4 py-3 hover:bg-white/5 transition-colors animate-in fade-in duration-300",
              i < rows.length - 1 ? "border-b border-border" : ""
            )}
            style={{
              animationDelay: `${i * 60}ms`,
              backgroundColor: s.position === 1 ? `color-mix(in oklch, ${color} 8%, transparent)` : undefined,
            }}
          >
            <div
              className="w-8 font-mono text-xl font-bold leading-none"
              style={s.position === 1 ? { color } : undefined}
            >
              {s.position}
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-sm font-semibold leading-tight">{s.name}</span>
              {s.sub && <span className="text-[10px] text-muted-foreground">{s.sub}</span>}
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums">{s.points}</div>
          </Link>
        ))}
      </div>
  );
}
