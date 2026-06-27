"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getSeriesConfig } from "@/lib/series-config";
import type { NewsItem } from "@/lib/cache";

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

export function NewsListSection({ news }: { news: NewsItem[] }) {
  const prevIdsRef = useRef<Set<string>>(new Set());

  // Determine new items before updating the ref (runs during render, before useEffect)
  const newIndexMap = new Map<string, number>();
  let newIdx = 0;
  for (const item of news) {
    if (!prevIdsRef.current.has(item.id)) {
      newIndexMap.set(item.id, newIdx++);
    }
  }

  useEffect(() => {
    prevIdsRef.current = new Set(news.map((n) => n.id));
  }, [news]);

  return (
    <div className="flex flex-col gap-2">
      {news.map((item) => {
        const config = getSeriesConfig(item.seriesSlug);
        const seriesColor = config?.color ?? "#6b7280";
        const seriesName = config?.shortName ?? item.seriesSlug.toUpperCase();
        const newItemIdx = newIndexMap.get(item.id);
        const isNew = newItemIdx !== undefined;

        return (
          <Link
            key={item.id}
            href={`/news/${item.id}`}
            style={isNew ? { animationDelay: `${Math.min(newItemIdx!, 12) * 40}ms` } : undefined}
            className={cn(
              "relative flex items-stretch bg-card border border-border rounded-xl overflow-hidden hover:bg-accent/30 transition-colors",
              isNew && "animate-in fade-in-0 slide-in-from-top-3 [animation-fill-mode:backwards] duration-300",
            )}
          >
            <div className="w-1 shrink-0" style={{ backgroundColor: seriesColor }} />
            <div className="flex-1 min-w-0 flex gap-3 p-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="font-display text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider"
                    style={{ color: seriesColor, backgroundColor: `${seriesColor}20` }}
                  >
                    {seriesName}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</p>
                {item.summary && (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                    {item.summary}
                  </p>
                )}
              </div>
              {item.imageUrl && (
                <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-muted relative">
                  <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
