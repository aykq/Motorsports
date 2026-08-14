"use client";

import { useFavorites } from "@/hooks/use-favorites";
import { SERIES_LIST, isSeriesVisible } from "@/lib/series-config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarOff, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";

interface Props {
  initialFavorites: string[];
  showNonF1Series: boolean;
}

export function FavoritesClient({ initialFavorites, showNonF1Series }: Props) {
  const t = useTranslations("favorites");
  const { isFavorite, toggle } = useFavorites(initialFavorites);
  const available = SERIES_LIST.filter(
    (s) => s.available && isSeriesVisible(s, showNonF1Series)
  );
  const coming = SERIES_LIST.filter((s) => !s.available);
  const favoritedAvailable = available.filter((s) => isFavorite(s.slug));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={<p className="text-sm text-muted-foreground">{t("subtitle")}</p>}
      />

      {favoritedAvailable.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {t("myFavorites")}
          </h2>
          {favoritedAvailable.map((series) => (
            <SeriesRow
              key={series.slug}
              series={series}
              isFav={true}
              onToggle={() => toggle(series.slug)}
              addLabel={t("addToFavorites")}
              removeLabel={t("removeFromFavorites")}
            />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
          {t("availableSeries")}
        </h2>
        {available.map((series) => (
          <SeriesRow
            key={series.slug}
            series={series}
            isFav={isFavorite(series.slug)}
            onToggle={() => toggle(series.slug)}
            addLabel={t("addToFavorites")}
            removeLabel={t("removeFromFavorites")}
          />
        ))}
      </section>

      {coming.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {t("comingSoon")}
          </h2>
          {coming.map((series) => (
            <Card key={series.slug} className="opacity-50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="font-medium">{series.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("comingSoon")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function SeriesRow({
  series,
  isFav,
  onToggle,
  addLabel,
  removeLabel,
}: {
  series: (typeof SERIES_LIST)[number];
  isFav: boolean;
  onToggle: () => void;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <Card
      className="transition-colors"
      style={
        isFav
          ? {
              background: `linear-gradient(100deg, color-mix(in oklch, ${series.color} 14%, var(--card)), var(--card) 60%)`,
              borderLeft: `3px solid ${series.color}`,
            }
          : undefined
      }
    >
      <CardContent className="flex items-center justify-between p-4">
        <Link
          href={`/${series.slug}`}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        >
          {!isFav && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: series.color }}
            />
          )}
          <span className="font-medium truncate">{series.name}</span>
          {series.category && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: `${series.color}25`, color: series.color }}
            >
              {series.category}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "ml-2 flex-shrink-0 cursor-pointer",
            isFav ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground"
          )}
          aria-label={isFav ? removeLabel : addLabel}
        >
          {isFav ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
        </Button>
      </CardContent>
    </Card>
  );
}
