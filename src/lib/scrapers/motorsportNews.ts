import * as cheerio from "cheerio";
import { db } from "@/db";
import { cachedNews } from "@/db/schema";

const BASE = "https://tr.motorsport.com";
const TIMEOUT_MS = 15_000;

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "img"; src: string; caption: string | null };

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function fixUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http")) return trimmed;
  return null;
}

const SHARE_PATTERN =
  /paylaş|kopyala|tweetle|pinterest|viber|linkedin|facebook|whatsapp|tercih edilen kaynak/i;

// Author names are short; anything containing these is a bloated container, not a name
const AUTHOR_GARBAGE =
  /yayın tarihi|linki kopyala|paylaş|tweetle|pinterest|viber|linkedin|facebook|whatsapp|tercih edilen/i;

function cleanAuthor(raw: string): string | null {
  // The fallback selector often grabs author + date + share buttons as one text blob.
  // Split at the first tab/newline or before "Yayın tarihi" and take the first segment.
  const first = raw.split(/[\t\n\r]|(?=Yayın tarihi)/i)[0].replace(/\s+/g, " ").trim();
  if (!first || first.length > 80 || AUTHOR_GARBAGE.test(first)) return null;
  return first;
}

const SERIES_URLS: Record<string, string> = {
  f1:     `${BASE}/f1/news/`,
  motogp: `${BASE}/motogp/news/`,
  moto2:  `${BASE}/moto2/news/`,
  wec:    `${BASE}/wec/news/`,
};

// URL pattern: /f1/news/some-slug/12345678/
const ARTICLE_URL_RE = /^\/(f1|motogp|moto2|wec)\/news\/[^/]+\/\d+\/?$/;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; motorsports-hub/1.0)",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeArticleUrls(listUrl: string): Promise<string[]> {
  const html = await fetchPage(listUrl);
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const urls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const path = href.split("?")[0].split("#")[0];
    if (ARTICLE_URL_RE.test(path) && !seen.has(path)) {
      seen.add(path);
      urls.push(`${BASE}${path}`);
    }
  });
  return urls.slice(0, 10);
}

interface ArticleData {
  title: string;
  imageUrl: string | null;
  summary: string | null;
  content: string | null;
  author: string | null;
  publishedAt: Date | null;
}

function extractBlocks($: cheerio.CheerioAPI): ContentBlock[] {
  const BODY_SELECTORS = [
    ".ms-article__body",
    '[class*="article-body"]',
    '[class*="article-content"]',
    '[class*="article-text"]',
    '[data-component="ArticleBody"]',
    "article",
    "main",
  ];

  let bodyEl: ReturnType<typeof $> | null = null;
  for (const sel of BODY_SELECTORS) {
    const el = $(sel).first();
    if (el.length) { bodyEl = el; break; }
  }
  if (!bodyEl) return [];

  const blocks: ContentBlock[] = [];

  // cheerio's .find("p, img") returns elements in document (DOM) order
  bodyEl.find("p, img").each((_, el) => {
    const $el = $(el);

    if ($el.is("p")) {
      const text = $el.text().trim();
      if (text.length > 30 && !SHARE_PATTERN.test(text)) {
        blocks.push({ type: "p", text });
      }
    } else if ($el.is("img")) {
      const w = $el.attr("width");
      if (w && parseInt(w) <= 10) return;
      const src = fixUrl($el.attr("src"));
      if (!src) return;
      const $figure = $el.closest("figure");
      const caption =
        $figure.find("figcaption").first().text().trim() ||
        $el.closest('[class*="caption"]').text().trim() ||
        null;
      blocks.push({ type: "img", src, caption: caption || null });
    }
  });

  return blocks;
}

async function scrapeArticle(url: string): Promise<ArticleData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const title = decodeEntities(
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    ""
  );

  // Hero image: og:image first, then article-specific selectors
  const imageUrl =
    fixUrl($('meta[property="og:image"]').attr("content")?.trim()) ||
    fixUrl($(".ms-article__main-img img, .ms-item__picture img").not('[width="10"]').first().attr("src")?.trim()) ||
    fixUrl($("article img").not('[width="10"]').first().attr("src")?.trim()) ||
    null;

  const summary = decodeEntities(
    $('meta[property="og:description"]').attr("content")?.trim() || ""
  ) || null;

  let publishedAt: Date | null = null;
  const dateStr =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="publishdate"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    null;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) publishedAt = d;
  }

  const rawAuthor =
    $('[itemprop="author"] [itemprop="name"]').first().text().trim() ||
    $('[rel="author"]').first().text().trim() ||
    $(".ms-author__name, .ms-article-author__name").first().text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    "";
  const author = rawAuthor ? cleanAuthor(rawAuthor) : null;

  const blocks = extractBlocks($);
  const content = blocks.length > 0 ? JSON.stringify(blocks) : null;

  return { title, imageUrl, summary, content, author, publishedAt };
}

export interface SyncResult {
  urlsFound: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function fetchAndCacheNews(seriesSlug: string): Promise<SyncResult> {
  const result: SyncResult = { urlsFound: 0, inserted: 0, skipped: 0, errors: [] };
  const listUrl = SERIES_URLS[seriesSlug];
  if (!listUrl) return result;

  let articleUrls: string[];
  try {
    articleUrls = await scrapeArticleUrls(listUrl);
    result.urlsFound = articleUrls.length;
  } catch (err) {
    result.errors.push(`list: ${String(err)}`);
    return result;
  }

  for (const url of articleUrls) {
    try {
      await delay(300);

      const data = await scrapeArticle(url);
      if (!data.title) { result.errors.push(`no title: ${url}`); continue; }

      await db
        .insert(cachedNews)
        .values({
          seriesSlug,
          title: data.title,
          url,
          imageUrl: data.imageUrl,
          summary: data.summary,
          content: data.content,
          author: data.author,
          publishedAt: data.publishedAt,
        })
        .onConflictDoUpdate({
          target: cachedNews.url,
          set: {
            title: data.title,
            imageUrl: data.imageUrl,
            summary: data.summary,
            content: data.content,
            author: data.author,
          },
        });
      result.inserted++;
    } catch (err) {
      result.errors.push(`${url}: ${String(err)}`);
    }
  }
  return result;
}
