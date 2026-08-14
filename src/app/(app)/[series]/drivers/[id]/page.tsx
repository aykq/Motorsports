import { getCachedDrivers, getCachedScheduleMultiYear, getCachedStandings } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { getMotoGPTeam, getMotoGPTeamByName } from "@/lib/motogp-teams";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/layout/BackButton";
import { DriverPhoto } from "@/components/series/DriverPhoto";
import { DriverRaceResultsSection } from "./DriverRaceResultsSection";
import Link from "next/link";
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
  if (driver) return { title: `${driver.firstName} ${driver.lastName}` };

  const races = await getCachedScheduleMultiYear(slug);
  const historicalName = races
    .flatMap((r) => r.results ?? [])
    .find((res) => res.driverId === id)?.driverName;
  return { title: historicalName ?? t("pilot") };
}

export default async function DriverDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("driversPage");
  const year = new Date().getFullYear();
  const subSeries = config.subSeries ?? [];
  const [{ drivers: mainDrivers }, subDriverResults, { standings: driverStandings }, races] =
    await Promise.all([
      getCachedDrivers(slug),
      Promise.all(subSeries.map((s) => getCachedDrivers(s))),
      getCachedStandings(slug, year, "driver"),
      getCachedScheduleMultiYear(slug),
    ]);

  const allDrivers = [
    ...mainDrivers,
    ...subDriverResults.flatMap((r) => r.drivers),
  ];

  let driver =
    allDrivers.find((d) => d.id === id) ??
    driverStandings.find((s) => s.driver?.id === id)?.driver;

  // Mevcut kadroda/güncel standings'te yok — emekli olmuş veya takım değiştirmiş
  // olabilir. Geçmiş sezonların yarış sonuçlarından minimal bir profil kur,
  // sayfa 404 vermek yerine elimizdeki veriyle gösterilsin.
  if (!driver) {
    const historicalResult = races
      .flatMap((r) => r.results ?? [])
      .find((res) => res.driverId === id);
    if (historicalResult) {
      const nameParts = historicalResult.driverName.trim().split(/\s+/);
      const lastName = nameParts.pop() ?? historicalResult.driverName;
      driver = {
        id,
        firstName: nameParts.join(" "),
        lastName,
        code: historicalResult.driverCode,
        number: historicalResult.driverNumber,
        nationality: "",
        team: historicalResult.team,
        teamId: historicalResult.teamId,
      };
    }
  }
  if (!driver) notFound();

  const standing = driverStandings.find((s) => s.driver?.id === id);
  const isMotoSeries = ["motogp", "moto2", "moto3"].includes(slug);
  const f1Team = slug === "f1"
    ? (getF1Team(driver.teamId) ?? getF1TeamByName(driver.team))
    : undefined;
  const motoTeam = isMotoSeries
    ? (getMotoGPTeam(driver.teamId ?? "") ?? getMotoGPTeamByName(driver.team ?? ""))
    : undefined;
  const teamColor = f1Team?.color ?? motoTeam?.color ?? config.color;

  const raceResults = races
    .filter((r) => r.status === "completed" && r.results?.some((res) => res.driverId === id))
    .map((r) => ({
      race: r,
      result: r.results!.find((res) => res.driverId === id)!,
    }))
    .sort((a, b) => new Date(b.race.date).getTime() - new Date(a.race.date).getTime());

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 pb-8">
      <div className="pt-6">
        <BackButton fallbackHref={`/${slug}/drivers`} label={t("title")} />
      </div>

      {/* ── Hero ── */}
      <div
        className="relative rounded-2xl border border-border overflow-hidden px-6 py-6"
        style={{
          background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColor}10 50%, transparent 100%)`,
        }}
      >
        {driver.number && (
          <span
            className="absolute -right-2 top-1/2 -translate-y-1/2 font-mono text-[90px] font-bold leading-none select-none pointer-events-none tabular-nums"
            style={{ color: teamColor, opacity: 0.12 }}
          >
            {driver.number}
          </span>
        )}
        <div className="relative flex items-center gap-4">
          <DriverPhoto
            image={driver.image}
            alt={driver.lastName}
            size={80}
            config={config}
            fallbackColor={teamColor}
            fallbackLabel={driver.code ?? driver.lastName[0]}
            className="ring-2 ring-border"
            priority
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
              {driver.firstName} {driver.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {driver.code && (
                <span
                  className="font-display text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${teamColor}30`, color: teamColor }}
                >
                  {driver.code}
                </span>
              )}
              {driver.number && (
                <span className="font-mono text-sm text-muted-foreground font-bold">#{driver.number}</span>
              )}
              <span className="text-sm text-muted-foreground">{driver.nationality}</span>
            </div>
            {driver.team && (
              driver.teamId ? (
                <Link
                  href={`/${slug}/teams/${driver.teamId}`}
                  className="text-sm text-muted-foreground mt-1 truncate block hover:text-foreground transition-colors hover:underline"
                >
                  {f1Team?.fullName ?? motoTeam?.name ?? driver.team}
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
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.position}</p>
              <p className="text-[10px] text-muted-foreground tracking-wide mt-0.5">{t("ranking")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.points}</p>
              <p className="text-[10px] text-muted-foreground tracking-wide mt-0.5">{t("points")}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums">{standing.wins}</p>
              <p className="text-[10px] text-muted-foreground tracking-wide mt-0.5">{t("wins")}</p>
            </div>
          </div>
        )}

        {/* ── Race Results ── */}
        <DriverRaceResultsSection slug={slug} raceResults={raceResults} />
      </div>
    </div>
  );
}
