import { getCachedNewsById } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

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

  const paragraphs = item.content
    ? item.content.split("\n\n").filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className="max-w-2xl mx-auto pb-24">
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
              className="text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wide mb-2 inline-block"
              style={{ color: seriesColor, backgroundColor: `${seriesColor}30` }}
            >
              {seriesName}
            </span>
            <h1 className="text-white text-xl font-bold leading-snug drop-shadow-lg">
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
              className="text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wide inline-block self-start"
              style={{ color: seriesColor, backgroundColor: `${seriesColor}20` }}
            >
              {seriesName}
            </span>
            <h1 className="text-2xl font-bold leading-snug">{item.title}</h1>
          </>
        )}

        {/* Meta: author + date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.author && (
            <>
              <span>{item.author}</span>
              <span>·</span>
            </>
          )}
          <span>{formatDate(item.publishedAt, locale)}</span>
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
        {paragraphs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/80">
                {para}
              </p>
            ))}
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
