import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeriesSubNav } from "@/components/series/SeriesSubNav";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("circuitsPage");
  return { title: `${config?.name ?? slug} • ${t("title")}` };
}

export default async function CircuitsListPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("circuitsPage");
  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);

  const circuits = Array.from(
    new Map(races.map((r) => [r.circuitId, r])).values()
  ).sort((a, b) => a.circuitName.localeCompare(b.circuitName));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        backHref={`/${slug}`}
        backLabel={config.shortName}
        eyebrow={config.name}
        title={t("title")}
        subtitle={<p className="text-xs text-muted-foreground font-mono">{t("count", { count: circuits.length })}</p>}
      />

      <SeriesSubNav slug={slug} color={config.color} active="circuits" />

      {circuits.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="space-y-1.5">
          {circuits.map((race) => (
            <Link key={race.circuitId} href={`/${slug}/circuits/${race.circuitId}`}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: config.color + "22" }}
                >
                  <MapPin className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{race.circuitName}</p>
                  <p className="text-xs text-muted-foreground">
                    {race.location}, {race.country}
                  </p>
                </div>
                {race.round < 900 && (
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{t("raceNumber", { round: race.round })}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
