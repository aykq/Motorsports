import { getCachedSchedule, getCachedStandings, getCachedDrivers } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1CircuitCoords, getF1CircuitPhotoUrl } from "@/lib/circuit-data";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { BackButton } from "@/components/layout/BackButton";
import { Countdown } from "@/components/race/Countdown";
import { WeatherChip } from "@/components/race/WeatherChip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const mo = (d: Date) => d.toLocaleDateString("tr-TR", { month: "short" });
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
  const [{ races }, { standings: driverStandings }, { standings: teamStandings }, { drivers }] = await Promise.all([
    getCachedSchedule(slug, year),
    getCachedStandings(slug, year, "driver"),
    getCachedStandings(slug, year, "team"),
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

  const top5Drivers = driverStandings.slice(0, 5);
  const top5Teams = teamStandings.slice(0, 5);

  const circuitPhotoUrl = nextRace && slug === "f1" ? getF1CircuitPhotoUrl(nextRace.circuitId) : null;
  const circuitCoords = nextRace && slug === "f1"
    ? (getF1CircuitCoords(nextRace.circuitId) ?? (
        nextRace.circuitLat && nextRace.circuitLng
          ? [nextRace.circuitLat, nextRace.circuitLng] as [number, number]
          : null
      ))
    : null;

  return (
    <div className="pb-24">
      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-4 pt-4">

        {/* Header */}
        <div className="flex items-center gap-1 -ml-2">
          <BackButton fallbackHref="/series" label="" />
          <h1 className="text-xl font-bold">{config.name}</h1>
        </div>

        {/* Next race card */}
        {nextRace && (
          <section className="bg-card rounded-xl border border-border relative overflow-hidden flex flex-col gap-3 shadow-lg">
            {/* Circuit photo background */}
            {circuitPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={circuitPhotoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none select-none"
                style={{ zIndex: 0 }}
              />
            )}
            {/* Dark scrim for readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 1,
                background: circuitPhotoUrl
                  ? "linear-gradient(to right, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.2) 100%)"
                  : `radial-gradient(circle at top right, ${config.color}33 0%, transparent 60%)`,
              }}
            />
            {/* Color accent */}
            {circuitPhotoUrl && (
              <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{ zIndex: 2, background: `radial-gradient(circle at top right, ${config.color} 0%, transparent 55%)` }}
              />
            )}

            {/* Content */}
            <div className="relative p-4 flex flex-col gap-3" style={{ zIndex: 10 }}>
              <div className="flex justify-between items-center">
                <span
                  className="text-[10px] font-semibold uppercase px-2 py-1 rounded tracking-wide"
                  style={{ color: config.color, backgroundColor: `${config.color}20` }}
                >
                  Next Round
                </span>
                {circuitCoords && (
                  <WeatherChip
                    raceDate={nextRace.date}
                    lat={circuitCoords[0]}
                    lng={circuitCoords[1]}
                  />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold leading-tight mb-1">{nextRace.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {nextRace.circuitName} &bull; {formatRaceWeekend(nextRace)}
                </p>
              </div>

              <Countdown targetDate={nextRace.date} compact />

              <div className="flex gap-2">
                <Link
                  href={`/${slug}/races/${nextRace.round}`}
                  className="text-xs font-semibold uppercase px-4 py-2 rounded transition-opacity hover:opacity-85 active:scale-95"
                  style={{ backgroundColor: config.color, color: "#fff" }}
                >
                  View Details
                </Link>
                <Link
                  href={`/${slug}/schedule`}
                  className="text-xs font-semibold uppercase px-4 py-2 rounded border border-border transition-colors hover:bg-white/5 active:scale-95"
                >
                  Schedule
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Drivers horizontal scroll */}
        {sortedDrivers.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Drivers</h3>
              <Link
                href={`/${slug}/drivers`}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: config.color }}
              >
                View All
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-3 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
              {sortedDrivers.map((driver) => {
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
                          className="w-full h-full object-cover object-[center_-5%] opacity-80"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className="text-4xl font-black leading-none"
                            style={{ color: teamColor, opacity: 0.35 }}
                          >
                            {driver.code ?? driver.lastName.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-card to-transparent" />
                    </div>
                    <div className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
                      <div className="text-sm font-semibold leading-tight">
                        {driver.firstName[0]}. {driver.lastName}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{driver.team}</div>
                    </div>
                    {driver.number !== undefined && (
                      <span
                        className="absolute top-1 right-1.5 text-xl font-black leading-none pointer-events-none select-none"
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

        {/* Standings */}
        {(top5Drivers.length > 0 || top5Teams.length > 0) && (
          <section className="mb-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Standings</h3>
              <Link href={`/${slug}/standings`} className="text-xs hover:opacity-70 transition-opacity" style={{ color: config.color }}>
                View All
              </Link>
            </div>
            <Tabs defaultValue="driver">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="driver" className="flex-1">Sürücüler</TabsTrigger>
                <TabsTrigger value="team" className="flex-1">Takımlar</TabsTrigger>
              </TabsList>
              <TabsContent value="driver" className="mt-0">
                <StandingsTable
                  color={config.color}
                  rows={top5Drivers.map((s) => {
                    const f1Team = slug === "f1" ? getF1TeamByName(s.driver?.team) : undefined;
                    return {
                      position: s.position,
                      name: s.driver?.lastName ?? s.driver?.firstName ?? "—",
                      sub: f1Team?.fullName ?? s.driver?.team ?? "",
                      href: s.driver ? `/${slug}/drivers/${s.driver.id}` : "#",
                      points: s.points,
                    };
                  })}
                />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <StandingsTable
                  color={config.color}
                  rows={top5Teams.map((s) => {
                    const f1Team = slug === "f1"
                      ? (getF1Team(s.team?.id) ?? getF1TeamByName(s.team?.name))
                      : undefined;
                    return {
                      position: s.position,
                      name: f1Team?.fullName ?? s.team?.name ?? "—",
                      sub: "",
                      href: s.team?.id ? `/${slug}/teams/${s.team.id}` : "#",
                      points: s.points,
                    };
                  })}
                />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {races.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Henüz veri yok.</p>
          </div>
        )}

      </div>
    </div>
  );
}

interface StandingsRow {
  position: number;
  name: string;
  sub: string;
  href: string;
  points: number;
}

function StandingsTable({ color, rows }: { color: string; rows: StandingsRow[] }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center px-4 py-2 border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
          <div className="w-8">POS</div>
          <div className="flex-1">NAME</div>
          <div>PTS</div>
        </div>
        {rows.map((s, i) => (
          <Link
            key={s.position}
            href={s.href}
            className={cn(
              "flex items-center px-4 py-3 hover:bg-white/5 transition-colors",
              i < rows.length - 1 ? "border-b border-border" : ""
            )}
          >
            <div
              className="w-8 text-xl font-bold leading-none"
              style={s.position === 1 ? { color } : undefined}
            >
              {s.position}
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-sm font-semibold leading-tight">{s.name}</span>
              {s.sub && <span className="text-[10px] text-muted-foreground">{s.sub}</span>}
            </div>
            <div className="text-sm font-semibold tabular-nums">{s.points}</div>
          </Link>
        ))}
      </div>
  );
}
