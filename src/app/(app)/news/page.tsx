import { getAllCachedNews } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = { title: "Haberler" };

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

export default async function NewsPage() {
  const t = await getTranslations("newsPage");
  const news = await getAllCachedNews(50);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight leading-none mb-5">{t("title")}</h1>

      {news.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-16">
          {t("noNews")}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {news.map((item) => {
          const config = getSeriesConfig(item.seriesSlug);
          const seriesColor = config?.color ?? "#6b7280";
          const seriesName = config?.shortName ?? item.seriesSlug.toUpperCase();

          return (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="relative flex items-stretch bg-card border border-border rounded-xl overflow-hidden hover:bg-accent/30 transition-colors"
            >
              {/* Left color stripe */}
              <div
                className="w-1 shrink-0"
                style={{ backgroundColor: seriesColor }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 flex gap-3 p-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* Series badge + time */}
                  <div className="flex items-center gap-2">
                    <span
                      className="font-display text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider"
                      style={{
                        color: seriesColor,
                        backgroundColor: `${seriesColor}20`,
                      }}
                    >
                      {seriesName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold leading-snug line-clamp-2">
                    {item.title}
                  </p>

                  {/* Summary */}
                  {item.summary && (
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                      {item.summary}
                    </p>
                  )}
                </div>

                {/* Thumbnail */}
                {item.imageUrl && (
                  <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-muted relative">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
