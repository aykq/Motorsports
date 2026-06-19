import { getCachedDrivers, getCachedSchedule, getCachedStandings } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
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
  const [{ drivers }, t] = await Promise.all([
    getCachedDrivers(slug),
    getTranslations("driversPage"),
  ]);
  const driver = drivers.find((d) => d.id === id);
  return { title: driver ? `${driver.firstName} ${driver.lastName}` : t("pilot") };
}

function positionBadge(pos: number, status: string) {
  const isDNF = status !== "Finished" && !/^\+/.test(status) && status !== "";
  if (isDNF)
    return (
      <span className="w-10 text-center text-xs font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
        DNF
      </span>
    );
  if (pos === 1)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shrink-0">
        P1
      </span>
    );
  if (pos === 2)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-zinc-400/20 text-zinc-300 border border-zinc-400/30 shrink-0">
        P2
      </span>
    );
  if (pos === 3)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 border border-orange-600/30 shrink-0">
        P3
      </span>
    );
  return (
    <span className="w-10 text-center text-xs font-bold shrink-0 text-muted-foreground">
      P{pos}
    </span>
  );
}

export default async function DriverDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("driversPage");
  const year = new Date().getFullYear();
  const [{ drivers }, { standings: driverStandings }, { races }] = await Promise.all([
    getCachedDrivers(slug),
    getCachedStandings(slug, year, "driver"),
    getCachedSchedule(slug, year),
  ]);

  const driver =
    drivers.find((d) => d.id === id) ??
    driverStandings.find((s) => s.driver?.id === id)?.driver;
  if (!driver) notFound();

  const standing = driverStandings.find((s) => s.driver?.id === id);
  const f1Team = slug === "f1" ? (getF1Team(driver.teamId) ?? getF1TeamByName(driver.team)) : undefined;
  const teamColor = f1Team?.color ?? config.color;

  const raceResults = races
    .filter((r) => r.status === "completed" && r.results?.some((res) => res.driverId === id))
    .map((r) => ({
      race: r,
      result: r.results!.find((res) => res.driverId === id)!,
    }))
    .sort((a, b) => b.race.round - a.race.round);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="px-4 pt-6">
        <BackButton fallbackHref={`/${slug}/drivers`} label={t("title")} />
      </div>

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-6 py-6"
        style={{
          background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColor}10 50%, transparent 100%)`,
        }}
      >
        {driver.number && (
          <span
            className="absolute -right-2 top-1/2 -translate-y-1/2 text-[90px] font-black leading-none select-none pointer-events-none"
            style={{ color: teamColor, opacity: 0.12 }}
          >
            {driver.number}
          </span>
        )}
        <div className="relative flex items-center gap-4">
          {driver.image ? (
            <Image
              src={driver.image}
              alt={driver.lastName}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover object-[center_-5%] bg-muted shrink-0 ring-2 ring-border"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
              style={{ backgroundColor: teamColor }}
            >
              {driver.code ?? driver.lastName[0]}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight">
              {driver.firstName} {driver.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {driver.code && (
                <span
                  className="text-xs font-black px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${teamColor}30`, color: teamColor }}
                >
                  {driver.code}
                </span>
              )}
              {driver.number && (
                <span className="text-sm text-muted-foreground font-bold">#{driver.number}</span>
              )}
              <span className="text-sm text-muted-foreground">{driver.nationality}</span>
            </div>
            {driver.team && (
              driver.teamId ? (
                <Link
                  href={`/${slug}/teams/${driver.teamId}`}
                  className="text-sm text-muted-foreground mt-1 truncate block hover:text-foreground transition-colors hover:underline"
                >
                  {f1Team?.fullName ?? driver.team}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 truncate">{driver.team}</p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* ── Stats ── */}
        {standing && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-2xl font-black">{standing.position}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("ranking")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-2xl font-black">{standing.points}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("points")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="text-2xl font-black">{standing.wins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t("wins")}</p>
            </div>
          </div>
        )}

        {/* ── Race Results ── */}
        {raceResults.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t("raceResults", { year })}
            </h2>
            <div className="space-y-1.5">
              {raceResults.map(({ race, result }) => {
                const isFinished =
                  result.status === "Finished" || /^\+/.test(result.status) || result.status === "";
                const isDNS =
                  result.status === "Did not start" || result.status === "DNS";
                const isDNF = !isFinished;
                return (
                  <Link
                    key={race.round}
                    href={`/${slug}/races/${race.round}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border text-sm hover:bg-accent/50 transition-colors"
                  >
                    {positionBadge(result.position, result.status)}
                    <span className="flex-1 truncate">{race.name}</span>
                    {isDNF ? (
                      <span className="text-xs shrink-0 text-red-400 font-semibold">
                        {isDNS ? "DNS" : "DNF"}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        {(result.gap ?? result.time) && (
                          <span className="text-xs text-white">
                            {result.gap ?? result.time}
                          </span>
                        )}
                        {result.points > 0 && (
                          <span className="text-xs font-bold text-white">
                            +{result.points}p
                          </span>
                        )}
                      </div>
                    )}
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
