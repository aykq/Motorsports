import Link from "next/link";
import { DriverCard } from "@/components/series/DriverCard";
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
        {entries.map(({ driver, points }, i) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            seriesSlug={slug}
            color={color}
            index={i}
            priority={i < 4}
            points={points}
            pointsAbbr={pointsAbbr}
          />
        ))}
      </div>
    </section>
  );
}
