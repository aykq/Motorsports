import { SERIES_LIST, getSeriesConfig } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("series");
  return { title: t("title") };
}

export default async function SeriesListPage() {
  const t = await getTranslations("series");
  const visibleSeries = SERIES_LIST.filter((s) => !s.hidden);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-0.5">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight leading-none">{t("title")}</h1>
        <p className="text-xs text-muted-foreground font-mono">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleSeries.map((series) => {
          const available = series.available;
          const inner = (
            <div
              className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-[var(--sc)] data-[avail=true]:hover:-translate-y-0.5"
              data-avail={available}
              style={{ "--sc": series.color } as CSSProperties}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: series.color }} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold uppercase tracking-tight leading-none" style={{ color: series.color }}>
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
            </div>
          );

          return available ? (
            <Link key={series.slug} href={`/${series.slug}`} className="block">
              {inner}
            </Link>
          ) : (
            <div key={series.slug} className="opacity-55 cursor-not-allowed">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
