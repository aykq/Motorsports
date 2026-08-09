import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Race } from "@/types/series";

function PodiumBadge({ position }: { position: number }) {
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold tabular-nums shrink-0",
        position === 1 && "bg-yellow-500/15 text-yellow-500",
        position === 2 && "bg-zinc-500/15 text-zinc-400",
        position === 3 && "bg-amber-700/15 text-amber-600"
      )}
    >
      {position}
    </div>
  );
}

export interface LastRacePodiumProps {
  race: Race;
  slug: string;
  color: string;
  title: string;
  pointsAbbr: string;
}

export function LastRacePodium({ race, slug, color, title, pointsAbbr }: LastRacePodiumProps) {
  const top3 = [...(race.results ?? [])].sort((a, b) => a.position - b.position).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <Link
      href={`/${slug}/races/${race.round}`}
      className="block bg-card rounded-xl border border-border overflow-hidden hover:border-white/20 transition-colors"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-display text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
          {title}
        </span>
        <span className="text-xs text-muted-foreground truncate">{race.name}</span>
      </div>
      <div>
        {top3.map((result, i) => (
          <div
            key={result.driverId}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5",
              i < top3.length - 1 && "border-b border-border"
            )}
          >
            <PodiumBadge position={result.position} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">{result.driverName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{result.team}</div>
            </div>
            <div className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
              {result.points} {pointsAbbr}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
