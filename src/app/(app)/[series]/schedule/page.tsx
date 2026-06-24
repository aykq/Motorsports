import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { RaceTimeline } from "@/components/race/RaceTimeline";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Race } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("schedulePage");
  return { title: `${config?.name ?? slug} — ${t("title")}` };
}

export default async function SchedulePage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const [t, raceStatusT, locale] = await Promise.all([
    getTranslations("schedulePage"),
    getTranslations("raceStatus"),
    getLocale(),
  ]);

  const year = new Date().getFullYear();

  const subConfigs = (config.subSeries ?? [])
    .map((s) => getSeriesConfig(s))
    .filter((c) => c !== undefined && c.available);

  const [{ races }, ...subResults] = await Promise.all([
    getCachedSchedule(slug, year),
    ...subConfigs.map((c) => getCachedSchedule(c!.slug, year)),
  ]);

  const subSeriesMap = new Map<string, Map<string, Race>>();
  subResults.forEach((result, i) => {
    const subConfig = subConfigs[i]!;
    result.races.forEach((race) => {
      if (!subSeriesMap.has(race.circuitId)) {
        subSeriesMap.set(race.circuitId, new Map());
      }
      subSeriesMap.get(race.circuitId)!.set(subConfig.slug, race);
    });
  });

  const statusLabels = {
    upcoming: raceStatusT("upcoming"),
    live: raceStatusT("live"),
    completed: raceStatusT("completed"),
    cancelled: raceStatusT("cancelled"),
    next: t("nextRace"),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="font-display text-2xl font-bold tracking-tight leading-none">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground font-mono">{t("season", { year, count: races.length })}</p>
      </div>

      {races.length > 0 ? (
        <RaceTimeline
          races={races}
          series={config}
          subSeriesMap={subSeriesMap}
          subConfigs={subConfigs.filter((c) => c !== undefined) as NonNullable<typeof subConfigs[number]>[]}
          locale={locale}
          nowLabel={raceStatusT("completed")}
          statusLabels={statusLabels}
        />
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{t("noData")}</p>
        </div>
      )}
    </div>
  );
}
