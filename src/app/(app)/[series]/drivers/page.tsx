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

interface Props {
  params: Promise<{ series: string }>;
  searchParams: Promise<{ cat?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("driversPage");
  return { title: `${config?.name ?? slug} — ${t("title")}` };
}

export default async function DriversListPage({ params, searchParams }: Props) {
  const { series: slug } = await params;
  const { cat } = await searchParams;
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

  const groupedByTeam = drivers.reduce<Record<string, typeof drivers>>((acc, d) => {
    const key = d.teamId ?? d.team ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    [slug]: config.name,
    ...Object.fromEntries(
      subSeries.map((s) => [s, getSeriesConfig(s)?.name ?? s.toUpperCase()])
    ),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="text-xl font-bold">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("count", { count: drivers.length })}</p>
      </div>

      {subSeries.length > 0 && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {validCats.map((catSlug) => (
            <Link
              key={catSlug}
              href={`/${slug}/drivers?cat=${catSlug}`}
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

      {drivers.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByTeam).map(([teamKey, teamDrivers]) => {
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
                            className={`w-10 h-10 rounded-full object-cover object-[center_15%] bg-muted shrink-0${config.driverImageBlend ? " mix-blend-multiply" : ""}`}
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
