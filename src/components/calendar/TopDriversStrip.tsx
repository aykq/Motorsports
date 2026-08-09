import Link from "next/link";
import Image from "next/image";
import { getF1Team } from "@/lib/f1-teams";
import type { TopDriverEntry } from "@/lib/home-hub";

export interface TopDriversStripProps {
  entries: TopDriverEntry[];
  slug: string;
  color: string;
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  pointsAbbr: string;
}

export function TopDriversStrip({ entries, slug, color, title, viewAllLabel, viewAllHref, pointsAbbr }: TopDriversStripProps) {
  if (entries.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">{title}</h3>
        <Link href={viewAllHref} className="text-xs hover:opacity-70 transition-opacity" style={{ color }}>
          {viewAllLabel}
        </Link>
      </div>
      <div className="flex overflow-x-auto gap-3 pb-3 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
        {entries.map(({ driver, points }, i) => {
          const f1Team = slug === "f1" ? getF1Team(driver.teamId) : undefined;
          const teamColor = f1Team?.color ?? color;
          return (
            <Link
              key={driver.id}
              href={`/${slug}/drivers/${driver.id}`}
              className="shrink-0 w-36 bg-card rounded-lg border border-border overflow-hidden flex flex-col relative hover:border-white/20 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              <div className="h-28 relative overflow-hidden" style={{ backgroundColor: `${teamColor}18` }}>
                {driver.image ? (
                  <Image
                    src={driver.image}
                    alt={driver.lastName}
                    fill
                    sizes="144px"
                    priority={i < 4}
                    className="object-cover opacity-80"
                    style={{ objectPosition: "center -35%" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-black leading-none" style={{ color: teamColor, opacity: 0.35 }}>
                      {driver.code ?? driver.lastName.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-card to-transparent" />
                <span className="absolute top-1.5 right-1.5 font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-black/50 text-white">
                  {points} {pointsAbbr}
                </span>
              </div>
              <div className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
                <div className="text-sm font-semibold leading-tight">
                  {driver.firstName[0]}. {driver.lastName}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{driver.team}</div>
              </div>
              {driver.number !== undefined && (
                <span
                  className="absolute top-1 left-1.5 text-xl font-black leading-none pointer-events-none select-none"
                  style={{ color: teamColor, opacity: 0.45 }}
                >
                  {driver.number}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
