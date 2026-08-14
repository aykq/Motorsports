import Link from "next/link";
import Image from "next/image";
import { getF1Team } from "@/lib/f1-teams";
import { getSeriesConfig } from "@/lib/series-config";
import type { Driver } from "@/types/series";

export interface DriverCardProps {
  driver: Driver;
  seriesSlug: string;
  color: string;
  index: number;
  priority?: boolean;
  points?: number;
  pointsAbbr?: string;
}

export function DriverCard({ driver, seriesSlug, color, index, priority, points, pointsAbbr }: DriverCardProps) {
  const config = getSeriesConfig(seriesSlug);
  const f1Team = seriesSlug === "f1" ? getF1Team(driver.teamId) : undefined;
  const teamColor = f1Team?.color ?? color;
  const objectPosition = config?.imageObjectPosition ?? "center -35%";
  const hasPointsBadge = points !== undefined && pointsAbbr !== undefined;

  return (
    <Link
      href={`/${seriesSlug}/drivers/${driver.id}`}
      className="shrink-0 w-36 bg-card rounded-lg border border-border overflow-hidden flex flex-col relative hover:border-white/20 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      <div className="h-28 relative overflow-hidden" style={{ backgroundColor: `${teamColor}18` }}>
        {driver.image ? (
          <Image
            src={driver.image}
            alt={driver.lastName}
            fill
            sizes="144px"
            priority={priority}
            className="object-cover opacity-80"
            style={{ objectPosition }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black leading-none" style={{ color: teamColor, opacity: 0.35 }}>
              {driver.code ?? driver.lastName.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-card to-transparent" />
        {hasPointsBadge && (
          <span className="absolute top-1.5 right-1.5 font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-black/50 text-white">
            {points} {pointsAbbr}
          </span>
        )}
      </div>
      <div className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
        <div className="text-sm font-semibold leading-tight">
          {driver.firstName[0]}. {driver.lastName}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{driver.team}</div>
      </div>
      {driver.number !== undefined && (
        <span
          className={`absolute top-1 text-xl font-black leading-none pointer-events-none select-none ${hasPointsBadge ? "left-1.5" : "right-1.5"}`}
          style={{ color: teamColor, opacity: 0.45 }}
        >
          {driver.number}
        </span>
      )}
    </Link>
  );
}
