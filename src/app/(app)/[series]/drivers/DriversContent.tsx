"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { getMotoGPTeam, getMotoGPTeamByName } from "@/lib/motogp-teams";
import { getSeriesConfig } from "@/lib/series-config";
import { TeamLogo } from "@/components/series/TeamLogo";
import { DriverPhoto } from "@/components/series/DriverPhoto";
import { BackButton } from "@/components/layout/BackButton";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types/series";
import type { SeriesConfig } from "@/lib/series-config";

interface Props {
  slug: string;
  config: SeriesConfig;
  driversByCategory: Record<string, Driver[]>;
  subSeries: string[];
  initialCat?: string;
  initialCls?: string;
}

type CarGroup = { carNo: number; teamId: string; team: string; drivers: Driver[] };

function buildCarGroups(list: Driver[]): CarGroup[] {
  const map = new Map<string, CarGroup>();
  for (const d of list) {
    const key = `${d.teamId ?? ""}-${d.number ?? "unknown"}`;
    if (!map.has(key)) {
      map.set(key, { carNo: d.number ?? 0, teamId: d.teamId ?? "", team: d.team ?? "", drivers: [] });
    }
    map.get(key)!.drivers.push(d);
  }
  return [...map.values()].sort((a, b) => a.carNo - b.carNo);
}

function groupByTeam(list: Driver[]): Record<string, Driver[]> {
  return list.reduce<Record<string, Driver[]>>((acc, d) => {
    const key = d.teamId ?? d.team ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});
}

export function DriversContent({
  slug,
  config,
  driversByCategory,
  subSeries,
  initialCat,
  initialCls,
}: Props) {
  const t = useTranslations("driversPage");

  const validCats = [slug, ...subSeries];
  const [activeCat, setActiveCat] = useState(
    initialCat && validCats.includes(initialCat) ? initialCat : slug
  );
  const [activeClass, setActiveClass] = useState(initialCls ?? "");

  const categoryLabels: Record<string, string> = {
    [slug]: config.name,
    ...Object.fromEntries(
      subSeries.map((s) => [s, getSeriesConfig(s)?.name ?? s.toUpperCase()])
    ),
  };

  const drivers = driversByCategory[activeCat] ?? [];
  const catConfig = getSeriesConfig(activeCat) ?? config;
  const isMotoSeries = ["motogp", "moto2", "moto3"].includes(activeCat);

  function getTeam(teamId?: string, teamName?: string) {
    return isMotoSeries
      ? (getMotoGPTeam(teamId ?? "") ?? getMotoGPTeamByName(teamName ?? ""))
      : (getF1Team(teamId) ?? getF1TeamByName(teamName));
  }

  const allCategories = [...new Set(drivers.map((d) => d.category ?? "").filter(Boolean))];
  const hasCategories = allCategories.length > 0;
  const currentClass = allCategories.includes(activeClass) ? activeClass : (allCategories[0] ?? "");

  const visibleDrivers = hasCategories
    ? drivers.filter((d) => d.category === currentClass)
    : drivers;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground font-mono">{t("count", { count: drivers.length })}</p>
      </div>

      {/* Sub-series tabs — instant client-side switch, no navigation */}
      {subSeries.length > 0 && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {validCats.map((catSlug) => (
            <button
              key={catSlug}
              type="button"
              onClick={() => setActiveCat(catSlug)}
              className={cn(
                "flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors",
                activeCat === catSlug
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {categoryLabels[catSlug]}
            </button>
          ))}
        </div>
      )}

      {/* Class tabs (Hypercar / LMGT3) */}
      {hasCategories && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {allCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveClass(c)}
              className={cn(
                "flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors",
                currentClass === c
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {visibleDrivers.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">{t("noData")}</p>
      ) : hasCategories ? (
        /* ── Car-crew table layout (WEC style) ── */
        <div className="space-y-3">
          {buildCarGroups(visibleDrivers).map(({ carNo, teamId, team, drivers: crewDrivers }) => {
            const teamData = getTeam(teamId, team);
            const accentColor = teamData?.color ?? catConfig.color;
            return (
              <div
                key={`${teamId}-${carNo}`}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60">
                  <span
                    className="font-mono text-xl font-bold tabular-nums w-10 shrink-0"
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
                <div className="flex divide-x divide-border/50">
                  {crewDrivers.map((driver) => (
                    <Link
                      key={driver.id}
                      href={`/${slug}/drivers/${driver.id}`}
                      className="flex-1 flex flex-col items-center gap-2 px-3 py-3 hover:bg-accent/40 transition-colors"
                    >
                      <DriverPhoto
                        image={driver.image}
                        alt={driver.lastName}
                        size={56}
                        config={catConfig}
                        fallbackColor={accentColor}
                        fallbackLabel={driver.code ?? driver.lastName[0]}
                      />
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
            const team = getTeam(firstDriver.teamId, firstDriver.team);
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
                        <DriverPhoto
                          image={driver.image}
                          alt={driver.lastName}
                          size={40}
                          config={catConfig}
                          fallbackColor={team?.color ?? "#52525b"}
                          fallbackLabel={driver.code ?? driver.lastName[0]}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {driver.firstName} {driver.lastName}
                            {driver.code && (
                              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                {driver.code}
                              </span>
                            )}
                          </p>
                        </div>
                        {driver.number && (
                          <span className="font-mono text-sm font-bold shrink-0 text-muted-foreground">
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
