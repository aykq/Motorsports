import { SERIES_LIST, getSeriesConfig } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("series");
  return { title: t("title") };
}

export default async function SeriesListPage() {
  const t = await getTranslations("series");
  const visibleSeries = SERIES_LIST.filter((s) => !s.hidden);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3">
        {visibleSeries.map((series) =>
          series.available ? (
            <Link key={series.slug} href={`/${series.slug}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: `${series.color}30`, border: `2px solid ${series.color}60` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm">{series.name}</p>
                      {series.category && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${series.color}25`, color: series.color }}
                        >
                          {series.category}
                        </span>
                      )}
                    </div>
                    {series.subSeries && series.subSeries.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {series.subSeries.map((sub) => {
                          const subConfig = getSeriesConfig(sub);
                          if (!subConfig) return null;
                          return (
                            <span
                              key={sub}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${subConfig.color}20`, color: subConfig.color }}
                            >
                              {subConfig.shortName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t("active")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={series.slug} className="opacity-50 cursor-not-allowed">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: `${series.color}30`, border: `2px solid ${series.color}60` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{series.name}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {t("comingSoon")}
                </Badge>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
