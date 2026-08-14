import Link from "next/link";
import { Countdown } from "@/components/race/Countdown";
import { WeatherChip } from "@/components/race/WeatherChip";
import { cn } from "@/lib/utils";
import type { Race } from "@/types/series";

export function formatRaceWeekend(race: Race, locale: string): string {
  const dates = race.sessions.map((s) => new Date(s.date)).sort((a, b) => a.getTime() - b.getTime());
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "";
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const mo = (d: Date) => d.toLocaleDateString(dateLocale, { month: "short" });
  if (first.getMonth() === last.getMonth()) {
    return `${mo(first)} ${first.getDate()} – ${last.getDate()}`;
  }
  return `${mo(first)} ${first.getDate()} – ${mo(last)} ${last.getDate()}`;
}

export interface NextRaceHeroCardProps {
  race: Race;
  slug: string;
  color: string;
  circuitPhotoUrl: string | null;
  circuitCoords: [number, number] | null;
  weekendLabel: string;
  nextRoundLabel: string;
  viewDetailsLabel: string;
  scheduleLabel: string;
}

export function NextRaceHeroCard({
  race,
  slug,
  color,
  circuitPhotoUrl,
  circuitCoords,
  weekendLabel,
  nextRoundLabel,
  viewDetailsLabel,
  scheduleLabel,
}: NextRaceHeroCardProps) {
  return (
    <section className="bg-card rounded-xl border border-border relative overflow-hidden flex flex-col gap-3 shadow-lg">
      {circuitPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={circuitPhotoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none select-none"
          style={{ zIndex: 0 }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: circuitPhotoUrl
            ? "linear-gradient(to right, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.2) 100%)"
            : `radial-gradient(circle at top right, ${color}33 0%, transparent 60%)`,
        }}
      />
      {circuitPhotoUrl && (
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{ zIndex: 2, background: `radial-gradient(circle at top right, ${color} 0%, transparent 55%)` }}
        />
      )}

      <div className="relative p-4 flex flex-col gap-3" style={{ zIndex: 10 }}>
        <div className="flex justify-between items-center">
          <span
            className="font-display text-[11px] font-semibold uppercase px-2 py-1 rounded tracking-[0.12em]"
            style={{ color, backgroundColor: `${color}20` }}
          >
            {nextRoundLabel}
          </span>
          {circuitCoords && (
            <WeatherChip
              raceDate={race.date}
              lat={circuitCoords[0]}
              lng={circuitCoords[1]}
            />
          )}
        </div>

        <div>
          <h2 className={cn("font-display text-2xl font-bold tracking-tight leading-tight mb-1.5", circuitPhotoUrl && "text-white")}>{race.name}</h2>
          <p className={cn("text-xs", circuitPhotoUrl ? "text-white/70" : "text-muted-foreground")}>
            {race.circuitName} &bull; <span className="font-mono">{weekendLabel}</span>
          </p>
        </div>

        <Countdown targetDate={race.date} compact invert={!!circuitPhotoUrl} />

        <div className="flex gap-2">
          <Link
            href={`/${slug}/races/${race.round}`}
            className="text-xs font-semibold uppercase px-4 py-2 rounded transition-opacity hover:opacity-85 active:scale-95"
            style={{ backgroundColor: color, color: "#fff" }}
          >
            {viewDetailsLabel}
          </Link>
          <Link
            href={`/${slug}/schedule`}
            className={cn(
              "text-xs font-semibold uppercase px-4 py-2 rounded border transition-colors active:scale-95",
              circuitPhotoUrl ? "border-white/30 text-white hover:bg-white/10" : "border-border hover:bg-white/5"
            )}
          >
            {scheduleLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
