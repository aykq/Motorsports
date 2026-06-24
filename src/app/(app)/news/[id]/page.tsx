import { getCachedNewsById } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, User, CalendarDays } from "lucide-react";
import type { ContentBlock } from "@/lib/scrapers/motorsportNews";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getCachedNewsById(id);
  return { title: item?.title ?? "Haber" };
}

function formatDate(date: Date | null, locale: string): string {
  if (!date) return "";
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseContent(raw: string | null): ContentBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ContentBlock[];
  } catch {
    // Legacy plain-text format
    return raw
      .split("\n\n")
      .filter((t) => t.trim().length > 0)
      .map((text) => ({ type: "p" as const, text }));
  }
  return [];
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, t, locale] = await Promise.all([
    getCachedNewsById(id),
    getTranslations("newsPage"),
    getLocale(),
  ]);

  if (!item) notFound();

  const config = getSeriesConfig(item.seriesSlug);
  const seriesColor = config?.color ?? "#6b7280";
  const seriesName = config?.shortName ?? item.seriesSlug.toUpperCase();

  const blocks = parseContent(item.content);

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Back button */}
      <div className="px-4 pt-4">
        <BackButton fallbackHref="/news" label={t("back")} />
      </div>

      {/* Hero image */}
      {item.imageUrl && (
        <div className="relative w-full aspect-video mt-3 overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span
              className="font-display text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wider mb-2 inline-block"
              style={{ color: seriesColor, backgroundColor: `${seriesColor}30` }}
            >
              {seriesName}
            </span>
            <h1 className="text-white font-display text-2xl sm:text-3xl font-bold leading-tight drop-shadow-lg">
              {item.title}
            </h1>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 flex flex-col gap-5">
        {/* Title when no hero image */}
        {!item.imageUrl && (
          <>
            <span
              className="font-display text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wider inline-block self-start"
              style={{ color: seriesColor, backgroundColor: `${seriesColor}20` }}
            >
              {seriesName}
            </span>
            <h1 className="font-display text-3xl font-bold leading-tight">{item.title}</h1>
          </>
        )}

        {/* Meta: author + date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {item.author && (
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 shrink-0" />
              {item.author}
            </span>
          )}
          {item.publishedAt && (
            <span className="flex items-center gap-1.5 font-mono">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              {formatDate(item.publishedAt, locale)}
            </span>
          )}
        </div>

        {/* Summary / lead */}
        {item.summary && (
          <p
            className="text-base font-medium leading-relaxed text-foreground/90 border-l-2 pl-3"
            style={{ borderColor: seriesColor }}
          >
            {item.summary}
          </p>
        )}

        {/* Article body */}
        {blocks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {blocks.map((block, i) => {
              if (block.type === "p") {
                return (
                  <p key={i} className="text-sm leading-relaxed text-foreground/80">
                    {block.text}
                  </p>
                );
              }
              if (block.type === "img") {
                return (
                  <figure key={i} className="m-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.src}
                      alt={block.caption ?? ""}
                      className="w-full rounded-lg"
                      loading="lazy"
                    />
                    {block.caption && (
                      <figcaption className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">İçerik yüklenemedi.</p>
        )}

        {/* Source link */}
        <Link
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 self-start"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("source")} — motorsport.com
        </Link>
      </div>
    </div>
  );
}
