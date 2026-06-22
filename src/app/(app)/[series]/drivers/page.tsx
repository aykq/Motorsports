import { getCachedDrivers } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { TeamLogo } from "@/components/series/TeamLogo";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { Driver } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
  searchParams: Promise<{ cat?: string; cls?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("driversPage");
  return { title: `${config?.name ?? slug} — ${t("title")}` };
}

export default async function DriversListPage({ params, searchParams }: Props) {
  const { series: slug } = await params;
  const { cat, cls } = await searchParams;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("driversPage");

  const subSeries = config.subSeries ?? [];
  const validCats = [slug, ...subSeries];
  const activeCat = cat && validCats.includes(cat) ? cat : slug;

  const [{ drivers: rawDrivers }, ...subResults] =
    activeCat === slug && subSeries.length > 0
      ? await Promise.all([
          getCachedDrivers(activeCat),
          ...subSeries.map((s) => getCachedDrivers(s)),
        ])
      : [await getCachedDrivers(activeCat)];

  const subSeriesIds = new Set(subResults.flatMap(({ drivers: d }) => d.map((r) => r.id)));
  const drivers = subSeriesIds.size > 0
    ? rawDrivers.filter((d) => !subSeriesIds.has(d.id))
    : rawDrivers;

  const categoryLabels: Record<string, string> = {
    [slug]: config.name,
    ...Object.fromEntries(
      subSeries.map((s) => [s, getSeriesConfig(s)?.name ?? s.toUpperCase()])
    ),
  };

  // Class-based grouping (e.g. WEC: Hypercar / LMGT3)
  const allCategories = [...new Set(drivers.map((d) => d.category ?? "").filter(Boolean))];
  const hasCategories = allCategories.length > 0;
  const activeClass = (cls && allCategories.includes(cls)) ? cls : (allCategories[0] ?? "");
  const visibleDrivers = hasCategories
    ? drivers.filter((d) => d.category === activeClass)
    : drivers;

  // Group by car (carNo + teamId) for crew-card layout
  type CarGroup = { carNo: number; teamId: string; team: string; drivers: Driver[] };
  const buildCarGroups = (list: Driver[]): CarGroup[] => {
    const map = new Map<string, CarGroup>();
    for (const d of list) {
      const key = `${d.teamId ?? ""}-${d.number ?? "unknown"}`;
      if (!map.has(key)) {
        map.set(key, { carNo: d.number ?? 0, teamId: d.teamId ?? "", team: d.team ?? "", drivers: [] });
      }
      map.get(key)!.drivers.push(d);
    }
    return [...map.values()].sort((a, b) => a.carNo - b.carNo);
  };

  // Standard team grouping for non-category series
  const groupByTeam = (list: Driver[]) =>
    list.reduce<Record<string, Driver[]>>((acc, d) => {
      const key = d.teamId ?? d.team ?? "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="text-xl font-bold">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("count", { count: drivers.length })}</p>
      </div>

      {/* Sub-series tabs (MotoGP / Moto2 / Moto3) */}
      {subSeries.length > 0 && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {validCats.map((catSlug) => (
            <Link
              key={catSlug}
              href={`/${slug}/drivers?cat=${catSlug}`}
              replace
              className={cn(
                "flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors",
                activeCat === catSlug
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {categoryLabels[catSlug]}
            </Link>
          ))}
        </div>
      )}

      {/* Class tabs (Hypercar / LMGT3) */}
      {hasCategories && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {allCategories.map((c) => (
            <Link
              key={c}
              href={`/${slug}/drivers?cls=${encodeURIComponent(c)}`}
              replace
              className={cn(
                "flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors",
                activeClass === c
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {visibleDrivers.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">{t("noData")}</p>
      ) : hasCategories ? (
        /* ── Car-crew table layout (WEC style) ── */
        <div className="space-y-3">
          {buildCarGroups(visibleDrivers).map(({ carNo, teamId, team, drivers: crewDrivers }) => {
            const teamData = getF1Team(teamId) ?? getF1TeamByName(team);
            const accentColor = teamData?.color ?? config.color;
            return (
              <div
                key={`${teamId}-${carNo}`}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Car header */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60">
                  <span
                    className="text-xl font-black tabular-nums w-10 shrink-0"
                    style={{ color: accentColor }}
                  >
                    {carNo}
                  </span>
                  <TeamLogo
                    src={teamData?.logo}
                    alt={team}
                    fallbackColor={accentColor}
                    fallbackText={teamData?.short ?? "?"}
                    className="h-5 w-auto shrink-0"
                    fallbackClassName="w-5 h-5 rounded-sm text-[9px] shrink-0"
                  />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                    {team}
                  </span>
                </div>

                {/* Crew row */}
                <div className="flex divide-x divide-border/50">
                  {crewDrivers.map((driver) => (
                    <Link
                      key={driver.id}
                      href={`/${slug}/drivers/${driver.id}`}
                      className="flex-1 flex flex-col items-center gap-2 px-3 py-3 hover:bg-accent/40 transition-colors"
                    >
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
                          className="w-14 h-14 rounded-full flex items-center justify-center text-xs font-black text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {driver.code ?? driver.lastName[0]}
                        </div>
                      )}
                      <div className="text-center min-w-0">
                        <p className="text-xs font-bold leading-tight truncate max-w-[72px]">
                          {driver.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[72px]">
                          {driver.firstName}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Standard team-grouped list (F1, MotoGP etc.) ── */
        <div className="space-y-3">
          {Object.entries(groupByTeam(visibleDrivers)).map(([teamKey, teamDrivers]) => {
            const firstDriver = teamDrivers[0];
            const team = getF1Team(firstDriver.teamId) ?? getF1TeamByName(firstDriver.team);
            return (
              <div key={teamKey}>
                <div className="flex items-center gap-2.5 px-1 mb-2">
                  <TeamLogo
                    src={team?.logo}
                    alt={firstDriver.team ?? ""}
                    fallbackColor={team?.color ?? "#52525b"}
                    fallbackText={team?.short ?? "?"}
                    className="h-6 w-auto shrink-0"
                    fallbackClassName="w-6 h-6 rounded-sm text-[10px] shrink-0"
                  />
                  <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                    {(firstDriver.team ?? t("unknownTeam")).toLocaleUpperCase("en-US")}
                  </span>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {teamDrivers.map((driver) => (
                    <Link key={driver.id} href={`/${slug}/drivers/${driver.id}`}>
                      <div className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors">
                        {driver.image ? (
                          <Image
                            src={driver.image}
                            alt={driver.lastName}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover bg-muted shrink-0"
                            style={{ objectPosition: config.imageObjectPosition ?? "center -35%" }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ backgroundColor: team?.color ?? "#52525b" }}
                          >
                            {driver.code ?? driver.lastName[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {driver.firstName} {driver.lastName}
                            {driver.code && (
                              <span className="ml-1.5 text-xs text-muted-foreground font-normal">{driver.code}</span>
                            )}
                          </p>
                        </div>
                        {driver.number && (
                          <span
                            className="text-sm font-black shrink-0"
                            style={{ color: team?.color ?? undefined }}
                          >
                            #{driver.number}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
