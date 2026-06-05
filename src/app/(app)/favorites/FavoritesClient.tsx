"use client";

import { useFavorites } from "@/hooks/use-favorites";
import { SERIES_LIST } from "@/lib/series-config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarOff, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Props {
  initialFavorites: string[];
}

export function FavoritesClient({ initialFavorites }: Props) {
  const t = useTranslations("favorites");
  const { isFavorite, toggle } = useFavorites(initialFavorites);
  const available = SERIES_LIST.filter((s) => s.available);
  const coming = SERIES_LIST.filter((s) => !s.available);
  const favoritedAvailable = available.filter((s) => isFavorite(s.slug));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {favoritedAvailable.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
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
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
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
    <Card className={cn("transition-colors", isFav && "border-primary/40 bg-primary/5")}>
      <CardContent className="flex items-center justify-between p-4">
        <Link
          href={`/${series.slug}`}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: series.color }}
          />
          <span className="font-medium truncate">{series.name}</span>
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
