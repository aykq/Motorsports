import { getCachedSchedule, getCachedStandings, getCachedDrivers } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1CircuitLayoutUrl, getF1CircuitCoords } from "@/lib/circuit-data";
import { getF1Team } from "@/lib/f1-teams";
import { BackButton } from "@/components/layout/BackButton";
import { Countdown } from "@/components/race/Countdown";
import { WeatherChip } from "@/components/race/WeatherChip";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import type { Race, Standing } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
}

function getRaceDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

function formatRaceWeekend(race: Race): string {
  const dates = race.sessions.map((s) => new Date(s.date)).sort((a, b) => a.getTime() - b.getTime());
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "";
  const mo = (d: Date) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  if (first.getMonth() === last.getMonth()) {
    return `${mo(first)} ${first.getDate()} – ${last.getDate()}`;
  }
  return `${mo(first)} ${first.getDate()} – ${mo(last)} ${last.getDate()}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  return { title: config?.name ?? slug.toUpperCase() };
}

export default async function SeriesPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const [{ races }, { standings: driverStandings }, { drivers }] = await Promise.all([
    getCachedSchedule(slug, year),
    getCachedStandings(slug, year, "driver"),
    getCachedDrivers(slug),
  ]);

  const nextRace = races
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime())[0] ?? null;

  const standingByDriverId = new Map<string, Standing>(
    driverStandings.map((s) => [s.driver?.id ?? "", s])
  );

  const sortedDrivers = [...drivers].sort((a, b) => {
    const posA = standingByDriverId.get(a.id)?.position ?? 999;
    const posB = standingByDriverId.get(b.id)?.position ?? 999;
    return posA - posB;
  });

  const top5 = driverStandings.slice(0, 5);
  const circuitLayoutUrl = nextRace && slug === "f1" ? getF1CircuitLayoutUrl(nextRace.circuitId) : null;
  const circuitCoords = nextRace && slug === "f1"
    ? (getF1CircuitCoords(nextRace.circuitId) ?? (
        nextRace.circuitLat && nextRace.circuitLng
          ? [nextRace.circuitLat, nextRace.circuitLng] as [number, number]
          : null
      ))
    : null;

  return (
    <div className="pb-24">
      <div className="px-4 flex flex-col gap-4 pt-4">

        {/* Context header */}
        <div className="flex items-center gap-1 -ml-2">
          <BackButton fallbackHref="/series" label="" />
          <h1 className="font-condensed text-[28px] font-bold uppercase tracking-tight leading-none">
            {config.name}
          </h1>
        </div>

        {/* Next GP card */}
        {nextRace && (
          <section className="bg-card rounded-xl border border-border p-4 relative overflow-hidden flex flex-col gap-3 shadow-lg">
            <div
              className="absolute inset-0 z-0 opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${config.color} 0%, transparent 60%)` }}
            />
            {circuitLayoutUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={circuitLayoutUrl}
                alt=""
                className="absolute right-[-15%] bottom-[-5%] w-52 h-52 object-contain opacity-20 pointer-events-none z-0 select-none"
              />
            )}

            <div className="z-10 flex justify-between items-center">
              <span
                className="font-mono text-[10px] uppercase px-2 py-1 rounded"
                style={{ color: config.color, backgroundColor: `${config.color}20` }}
              >
                Next Round
              </span>
              <WeatherChip
                raceDate={nextRace.date}
                lat={circuitCoords?.[0]}
                lng={circuitCoords?.[1]}
              />
            </div>

            <div className="z-10">
              <h2 className="font-condensed text-2xl font-bold uppercase tracking-tight leading-none mb-1">
                {nextRace.name}
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
                {nextRace.circuitName} &bull; {formatRaceWeekend(nextRace)}
              </p>
            </div>

            <div className="z-10">
              <Countdown targetDate={nextRace.date} compact />
            </div>

            <div className="z-10 flex gap-2">
              <Link
                href={`/${slug}/races/${nextRace.round}`}
                className="font-mono text-[11px] uppercase px-4 py-2 rounded transition-opacity hover:opacity-85 active:scale-95"
                style={{ backgroundColor: config.color, color: "#fff" }}
              >
                View Details
              </Link>
              <Link
                href={`/${slug}/schedule`}
                className="font-mono text-[11px] uppercase px-4 py-2 rounded border border-border transition-colors hover:bg-white/5 active:scale-95"
              >
                Schedule
              </Link>
            </div>
          </section>
        )}

        {/* Drivers horizontal scroll */}
        {sortedDrivers.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-condensed text-xl font-bold uppercase tracking-tight">Drivers</h3>
              <Link
                href={`/${slug}/drivers`}
                className="font-mono text-[10px] uppercase hover:opacity-70 transition-opacity"
                style={{ color: config.color }}
              >
                View All
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sortedDrivers.slice(0, 12).map((driver) => {
                const f1Team = slug === "f1" ? getF1Team(driver.teamId) : undefined;
                const teamColor = f1Team?.color ?? config.color;
                return (
                  <Link
                    key={driver.id}
                    href={`/${slug}/drivers/${driver.id}`}
                    className="shrink-0 w-36 bg-card rounded-lg border border-border overflow-hidden flex flex-col relative hover:border-white/20 transition-colors"
                  >
                      <div className="h-28 relative overflow-hidden" style={{ backgroundColor: `${teamColor}18` }}>
                        {driver.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={driver.image}
                            alt={driver.lastName}
                            className="w-full h-full object-cover opacity-80"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span
                              className="font-condensed text-4xl font-black leading-none"
                              style={{ color: teamColor, opacity: 0.35 }}
                            >
                              {driver.code ?? driver.lastName.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-card to-transparent" />
                      </div>
                      <div className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
                        <div className="font-condensed text-sm font-bold leading-none uppercase">
                          {driver.firstName[0]}. {driver.lastName}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground truncate uppercase">
                          {driver.team}
                        </div>
                      </div>
                      {driver.number !== undefined && (
                        <span
                          className="absolute top-1 right-1.5 font-condensed text-xl font-black leading-none pointer-events-none select-none"
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
        )}

        {/* Championship standings */}
        {top5.length > 0 && (
          <section className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-condensed text-xl font-bold uppercase tracking-tight">
                Championship Standings
              </h3>
              <Link
                href={`/${slug}/standings`}
                className="font-mono text-[10px] uppercase hover:opacity-70 transition-opacity"
                style={{ color: config.color }}
              >
                View All
              </Link>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center px-4 py-2 border-b border-border font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                <div className="w-8">POS</div>
                <div className="flex-1">DRIVER</div>
                <div>PTS</div>
              </div>
              {top5.map((s, i) => (
                <Link
                  key={s.position}
                  href={s.driver ? `/${slug}/drivers/${s.driver.id}` : "#"}
                  className={cn(
                    "flex items-center px-4 py-3 hover:bg-white/5 transition-colors",
                    i < top5.length - 1 ? "border-b border-border" : ""
                  )}
                >
                  <div
                    className="w-8 font-condensed text-xl font-bold leading-none"
                    style={s.position === 1 ? { color: config.color } : undefined}
                  >
                    {s.position}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="font-condensed text-base font-bold uppercase leading-none">
                      {s.driver?.lastName ?? s.driver?.firstName ?? "—"}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase truncate">
                      {s.driver?.team}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold">{s.points}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {races.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-mono text-sm">Henüz veri yok.</p>
          </div>
        )}

      </div>
    </div>
  );
}
