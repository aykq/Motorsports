import { SERIES_LIST, getSeriesConfig, isSeriesVisible } from "@/lib/series-config";
import { getShowNonF1Series } from "@/lib/app-settings";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeriesGlowSurface } from "@/components/series/SeriesGlowSurface";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("series");
  return { title: t("title") };
}

export default async function SeriesListPage() {
  const t = await getTranslations("series");
  const showNonF1Series = await getShowNonF1Series();
  const visibleSeries = SERIES_LIST.filter(
    (s) => !s.hidden && isSeriesVisible(s, showNonF1Series)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={<p className="text-xs text-muted-foreground font-mono">{t("subtitle")}</p>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleSeries.map((series) => {
          const available = series.available;
          const content = (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold tracking-tight leading-tight" style={{ color: series.color }}>
                  {series.shortName}
                </p>
                <p className="text-sm font-medium mt-1.5 leading-tight">{series.name}</p>
                {series.subSeries && series.subSeries.length > 0 && (
                  <div className="flex gap-1 mt-2.5 flex-wrap">
                    {series.subSeries.map((sub) => {
                      const subConfig = getSeriesConfig(sub);
                      if (!subConfig) return null;
                      return (
                        <span
                          key={sub}
                          className="font-display text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${subConfig.color}20`, color: subConfig.color }}
                        >
                          {subConfig.shortName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <Badge variant={available ? "secondary" : "outline"} className="shrink-0">
                {available ? t("active") : t("comingSoon")}
              </Badge>
            </div>
          );

          return available ? (
            <SeriesGlowSurface key={series.slug} color={series.color} as="a" href={`/${series.slug}`} className="p-5 transition-transform hover:-translate-y-0.5">
              {content}
            </SeriesGlowSurface>
          ) : (
            <SeriesGlowSurface key={series.slug} color={series.color} className="p-5 opacity-55 cursor-not-allowed">
              {content}
            </SeriesGlowSurface>
          );
        })}
      </div>
    </div>
  );
}
