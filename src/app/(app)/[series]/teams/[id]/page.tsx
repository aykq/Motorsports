import { getCachedStandings, getCachedDrivers, getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1Team } from "@/lib/f1-teams";
import { TeamLogo } from "@/components/series/TeamLogo";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/layout/BackButton";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, id } = await params;
  const year = new Date().getFullYear();
  const [{ standings }, t] = await Promise.all([
    getCachedStandings(slug, year, "team"),
    getTranslations("teamsPage"),
  ]);
  const team = standings.find((s) => s.team?.id === id);
  return { title: team?.team?.name ?? t("team") };
}

function positionClass(pos: number): string {
  if (pos === 1) return "text-yellow-400 font-black";
  if (pos === 2) return "text-zinc-300 font-black";
  if (pos === 3) return "text-orange-400 font-black";
  return "font-bold";
}

export default async function TeamDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("teamsPage");
  const year = new Date().getFullYear();
  const [{ standings: teamStandings }, { standings: driverStandings }, { drivers }, { races }] =
    await Promise.all([
      getCachedStandings(slug, year, "team"),
      getCachedStandings(slug, year, "driver"),
      getCachedDrivers(slug),
      getCachedSchedule(slug, year),
    ]);

  const standing = teamStandings.find((s) => s.team?.id === id);
  const teamDrivers = drivers.filter((d) => d.teamId === id);
  if (!standing && teamDrivers.length === 0) notFound();

  const teamName = standing?.team?.name ?? teamDrivers[0]?.team ?? id;
  const f1Team = slug === "f1" ? getF1Team(id) : undefined;
  const teamColor = f1Team?.color ?? config.color;

  const isCarBased = slug === "gt3" || slug === "gt4";

  // Group drivers by car number (for GT3/GT4 multi-driver entries)
  const carEntries = (() => {
    if (!isCarBased) return null;
    const map = new Map<number, typeof teamDrivers>();
    for (const d of teamDrivers) {
      const key = d.number ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  })();

  const completedRaces = races
    .filter((r) => r.status === "completed")
    .sort((a, b) => a.round - b.round);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="px-4 pt-6">
        <BackButton fallbackHref={`/${slug}/teams`} label={t("title")} />
      </div>

      {/* ── Hero Banner ── */}
      <div
        className="relative px-6 py-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColor}10 50%, transparent 100%)`,
        }}
      >
        <div
          className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 blur-2xl"
          style={{ backgroundColor: teamColor }}
        />
        <div className="relative flex items-center gap-5">
          <TeamLogo
            src={f1Team?.logo}
            alt={standing?.team?.name ?? teamName}
            fallbackColor={teamColor}
            fallbackText={f1Team?.short ?? standing?.team?.name?.[0] ?? teamName[0] ?? "?"}
            className="w-16 h-16 shrink-0"
            fallbackClassName="w-16 h-16 rounded-xl text-lg shrink-0"
          />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight leading-none">{teamName}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {year} · {standing?.team?.nationality ?? ""}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* ── Stats ── */}
        {standing && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.position}</p>
              <p className="font-display text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("ranking")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.points}</p>
              <p className="font-display text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("points")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.wins}</p>
              <p className="font-display text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("wins")}</p>
            </div>
          </div>
        )}

        {/* ── Pilots (GT3/GT4: grouped by car entry) ── */}
        {teamDrivers.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t("pilots")}
            </h2>

            {isCarBased && carEntries ? (
              <div className="space-y-4">
                {carEntries.map(([carNo, entryDrivers]) => {
                  const carModel = entryDrivers[0]?.carModel;
                  return (
                    <div key={carNo} className="rounded-lg border border-border overflow-hidden">
                      {/* Car header */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ background: `${teamColor}18` }}
                      >
                        <span
                          className="text-lg font-black tabular-nums leading-none"
                          style={{ color: teamColor }}
                        >
                          #{carNo}
                        </span>
                        {carModel && (
                          <span className="text-sm font-semibold text-foreground truncate">
                            {carModel}
                          </span>
                        )}
                      </div>

                      {/* Drivers in this car */}
                      <div className="grid grid-cols-2 gap-0 divide-x divide-border border-t border-border">
                        {entryDrivers.map((driver) => {
                          const ds = driverStandings.find((s) => s.driver?.id === driver.id);
                          return (
                            <Link key={driver.id} href={`/${slug}/drivers/${driver.id}`}>
                              <div className="p-3 hover:bg-accent/50 transition-colors space-y-2 h-full">
                                {driver.image ? (
                                  <Image
                                    src={driver.image}
                                    alt={driver.lastName}
                                    width={56}
                                    height={56}
                                    className="w-14 h-14 rounded-full object-cover bg-muted"
                                    style={{ objectPosition: config.imageObjectPosition ?? "center -35%" }}
                                  />
                                ) : (
                                  <div
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-black text-white"
                                    style={{ backgroundColor: teamColor }}
                                  >
                                    {driver.code ?? driver.lastName[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-sm leading-tight">
                                    {driver.firstName} {driver.lastName}
                                  </p>
                                </div>
                                {ds && (
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                                    <span className="text-muted-foreground">P{ds.position}</span>
                                    <span className="font-bold">{ds.points} {t("points").toLowerCase()}</span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {teamDrivers.map((driver) => {
                  const ds = driverStandings.find((s) => s.driver?.id === driver.id);
                  return (
                    <Link key={driver.id} href={`/${slug}/drivers/${driver.id}`}>
                      <div className="rounded-lg bg-card border border-border p-3 hover:bg-accent/50 transition-colors space-y-2">
                        {driver.image ? (
                          <Image
                            src={driver.image}
                            alt={driver.lastName}
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-full object-cover bg-muted"
                            style={{ objectPosition: config.imageObjectPosition ?? "center -35%" }}
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-black text-white"
                            style={{ backgroundColor: teamColor }}
                          >
                            {driver.code ?? driver.lastName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {driver.firstName} {driver.lastName}
                          </p>
                          {driver.number && (
                            <p
                              className="text-xs font-black mt-0.5"
                              style={{ color: teamColor }}
                            >
                              #{driver.number}
                            </p>
                          )}
                        </div>
                        {ds && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                            <span className="text-muted-foreground">P{ds.position}</span>
                            <span className="font-bold">{ds.points} {t("points").toLowerCase()}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Race-by-race Results ── */}
        {completedRaces.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t("raceResults")}
            </h2>
            <div className="space-y-1.5">
              {completedRaces.map((race) => {
                const teamResults = (race.results ?? []).filter((r) =>
                  teamDrivers.some((d) => d.id === r.driverId)
                );
                if (teamResults.length === 0) return null;
                return (
                  <Link key={race.round} href={`/${slug}/races/${race.round}`}>
                    <div className="rounded-lg bg-card border border-border px-3 py-2.5 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium truncate">{race.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {t("round", { round: race.round })}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        {teamResults.map((r) => {
                          const dCode = teamDrivers.find((d) => d.id === r.driverId)?.code ?? r.driverName.split(" ").pop();
                          return (
                            <div key={r.driverId} className="flex items-center gap-1.5 text-xs">
                              <span
                                className={`text-sm ${positionClass(r.position)}`}
                                style={r.position <= 3 ? undefined : { color: teamColor }}
                              >
                                P{r.position}
                              </span>
                              <span className="text-muted-foreground">{dCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
