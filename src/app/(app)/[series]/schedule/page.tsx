import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig, SERIES_LIST } from "@/lib/series-config";
import { RaceCard } from "@/components/race/RaceCard";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { Race } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
}

function getRaceDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
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

  const t = await getTranslations("schedulePage");
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

  const completed = races
    .filter((r) => r.status === "completed")
    .sort((a, b) => getRaceDate(b).getTime() - getRaceDate(a).getTime());

  const upcoming = races
    .filter((r) => r.status !== "completed")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const hasSubSeries = subConfigs.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="text-xl font-bold">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("season", { year, count: races.length })}</p>
      </div>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {t("upcoming", { count: upcoming.length })}
          </h2>
          {upcoming.map((race) => (
            <div key={race.round} className="space-y-1.5">
              <RaceCard race={race} series={config} />
              {hasSubSeries && (
                <SubSeriesChips
                  circuitId={race.circuitId}
                  subSeriesMap={subSeriesMap}
                  subConfigs={subConfigs.filter((c) => c !== undefined) as NonNullable<typeof subConfigs[number]>[]}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {t("completed", { count: completed.length })}
          </h2>
          {completed.map((race) => (
            <div key={race.round} className="space-y-1.5">
              <RaceCard race={race} series={config} />
              {hasSubSeries && (
                <SubSeriesChips
                  circuitId={race.circuitId}
                  subSeriesMap={subSeriesMap}
                  subConfigs={subConfigs.filter((c) => c !== undefined) as NonNullable<typeof subConfigs[number]>[]}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {races.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{t("noData")}</p>
        </div>
      )}
    </div>
  );
}

interface SubSeriesChipsProps {
  circuitId: string;
  subSeriesMap: Map<string, Map<string, Race>>;
  subConfigs: NonNullable<ReturnType<typeof getSeriesConfig>>[];
}

function SubSeriesChips({ circuitId, subSeriesMap, subConfigs }: SubSeriesChipsProps) {
  const eventSubSeries = subSeriesMap.get(circuitId);
  if (!eventSubSeries || eventSubSeries.size === 0) return null;

  return (
    <div className="flex gap-2 pl-1">
      {subConfigs.map((subConfig) => {
        const subRace = eventSubSeries.get(subConfig.slug);
        if (!subRace) return null;
        return (
          <Link
            key={subConfig.slug}
            href={`/${subConfig.slug}/races/${subRace.round}`}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition-colors hover:opacity-80"
            style={{
              borderColor: `${subConfig.color}40`,
              color: subConfig.color,
              backgroundColor: `${subConfig.color}10`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: subConfig.color }}
            />
            {subConfig.shortName}
          </Link>
        );
      })}
    </div>
  );
}
