import { getCachedNewsById } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, User, CalendarDays, Camera } from "lucide-react";
import type { ContentBlock, ResultRow } from "@/lib/scrapers/motorsportNews";

// SVG src gibi "//cdn.../cf/gb-2.svg" → 🇬🇧
function flagEmoji(src: string): string {
  const m = src.match(/\/cf\/([a-z]{2})-/);
  if (!m) return "";
  const code = m[1].toUpperCase();
  return [...code].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

function ResultTable({ label, rows }: { label: string; rows: ResultRow[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden text-sm">
      {label && (
        <div className="px-3 py-2 bg-muted/50 border-b border-border">
          <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        </div>
      )}
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.position} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/20 transition-colors">
            <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 text-right">
              {row.position}
            </span>
            <span className="text-base leading-none w-5 shrink-0">{flagEmoji(row.flagSrc)}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs">{row.driverName}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">{row.team}</span>
            </div>
            {row.time && (
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">{row.time}</span>
            )}
            {row.gap && (
              <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">{row.gap}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
        <div className="relative mx-4 aspect-video mt-3 overflow-hidden rounded-xl">
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
                const isPhotoCredit =
                  block.text.length < 180 &&
                  /^(Fotoğraf|Foto|Photo(graph)?( by)?|©|Resim|Görsel)\s*[:;©]/i.test(block.text);
                // Very short p-block immediately after an image → image label (e.g. "Fernando Alonso, Aston Martin Racing")
                const prevBlock = i > 0 ? blocks[i - 1] : null;
                const isImageLabel = !isPhotoCredit && prevBlock?.type === "img" && block.text.length < 120;

                if (isPhotoCredit || isImageLabel) {
                  return (
                    <p key={i} className="text-xs italic text-muted-foreground/70 leading-tight text-center -mt-2">
                      {isPhotoCredit
                        ? block.text.replace(/^(Fotoğraf|Foto|Photo(?:graph)?(?:\s+by)?)\s*[:;]\s*/i, "")
                        : block.text}
                    </p>
                  );
                }
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
                      <figcaption className="flex items-start gap-1 mt-1.5 px-0.5">
                        <Camera className="w-2.5 h-2.5 shrink-0 mt-[1px] text-muted-foreground/40" />
                        <span className="text-[10px] leading-snug text-muted-foreground/50 italic tracking-wide">
                          {block.caption}
                        </span>
                      </figcaption>
                    )}
                  </figure>
                );
              }
              if (block.type === "result-table") {
                return <ResultTable key={i} label={block.label} rows={block.rows} />;
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
