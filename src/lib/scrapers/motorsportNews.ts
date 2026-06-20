import * as cheerio from "cheerio";
import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE = "https://tr.motorsport.com";
const TIMEOUT_MS = 15_000;

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

async function scrapeArticle(url: string): Promise<ArticleData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    "";

  const imageUrl =
    $('meta[property="og:image"]').attr("content")?.trim() || null;

  const summary =
    $('meta[property="og:description"]').attr("content")?.trim() || null;

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

  const author =
    $('[itemprop="author"] [itemprop="name"]').first().text().trim() ||
    $('[rel="author"]').first().text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    null;

  const contentSelectors = [
    '[class*="article-body"] p',
    '[class*="article-content"] p',
    '[class*="article-text"] p',
    '[data-component="ArticleBody"] p',
    'article p',
    'main p',
  ];

  let content: string | null = null;
  for (const sel of contentSelectors) {
    const paras = $(sel)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 30);
    if (paras.length > 0) {
      content = paras.join("\n\n");
      break;
    }
  }

  return { title, imageUrl, summary, content, author, publishedAt };
}

export async function fetchAndCacheNews(seriesSlug: string): Promise<void> {
  const listUrl = SERIES_URLS[seriesSlug];
  if (!listUrl) return;

  let articleUrls: string[];
  try {
    articleUrls = await scrapeArticleUrls(listUrl);
  } catch (err) {
    console.error(`[news] list scrape failed for ${seriesSlug}:`, err);
    return;
  }

  for (const url of articleUrls) {
    try {
      const existing = await db.query.cachedNews.findFirst({
        where: eq(cachedNews.url, url),
        columns: { id: true },
      });
      if (existing) continue;

      await delay(500);

      const data = await scrapeArticle(url);
      if (!data.title) continue;

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
        .onConflictDoNothing();
    } catch (err) {
      console.warn(`[news] article scrape failed: ${url}`, err);
    }
  }
}
