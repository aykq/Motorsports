# News Scraping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape Turkish motorsport news from tr.motorsport.com and display them in-app with a dedicated "Haberler" bottom nav tab, per-article reading experience, and series badges.

**Architecture:** Cheerio-based scraper fetches article lists + full content (no Playwright needed — site is SSR). Articles stored in `cachedNews` DB table. A cron endpoint (`/api/cron/news`) refreshes news every 30 minutes. UI has three surfaces: a global `/news` page (all series), per-article detail at `/news/[id]`, and a "Son Haberler" strip on each series page.

**Tech Stack:** Cheerio (already installed), Drizzle ORM, Next.js App Router server components, next-intl, Tailwind CSS, lucide-react

## Global Constraints

- Cheerio only — no Playwright, no headless browser, no Dockerfile changes
- Scraper must be silent on failure (never throw to caller, always return empty/partial)
- 500 ms delay between article fetches to avoid hammering the server
- Series supported: `f1`, `motogp`, `moto2`, `wec` — others silently skipped
- All user-facing strings in both `messages/tr.json` and `messages/en.json`
- Follow existing patterns: `verifyCronSecret`, `requireAdmin`, `cache()` wrapper, `{ ok, message }` server actions
- Commits in English

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modify | Add `cachedNews` table |
| `src/lib/scrapers/motorsportNews.ts` | Create | Cheerio scraper (list + full content) |
| `src/lib/cache.ts` | Modify | Add `getCachedNews` + `setCachedNews` |
| `src/app/api/cron/news/route.ts` | Create | POST endpoint for cron news sync |
| `src/app/(app)/admin/actions.ts` | Modify | Add `syncNewsAction` server action |
| `src/app/(app)/admin/AdminPanel.tsx` | Modify | Add "Haberleri Sync Et" button in Sync tab |
| `src/components/layout/BottomNav.tsx` | Modify | Add "Haberler" tab (Newspaper icon) |
| `messages/tr.json` | Modify | Add `nav.news`, `newsPage.*` keys |
| `messages/en.json` | Modify | Add `nav.news`, `newsPage.*` keys |
| `src/app/(app)/news/page.tsx` | Create | All-series news list page |
| `src/app/(app)/news/[id]/page.tsx` | Create | Article detail page |
| `src/app/(app)/[series]/page.tsx` | Modify | Add "Son Haberler" strip at bottom |

---

## Task 1: DB Schema + Migration

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `cachedNews` table export, `CachedNewsRow` shape used by Tasks 3–6

- [ ] **Step 1: Add `cachedNews` table to schema**

Open `src/db/schema.ts`. After the `cachedRaceDetails` table block, add:

```typescript
export const cachedNews = pgTable(
  "cached_news",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seriesSlug: text("series_slug").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    summary: text("summary"),
    content: text("content"),
    author: text("author"),
    publishedAt: timestamp("published_at"),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cached_news_url_idx").on(t.url)]
);
```

- [ ] **Step 2: Generate migration**

```bash
npm run db:generate
```

Expected: new file created in `drizzle/` folder with `CREATE TABLE cached_news` SQL.

- [ ] **Step 3: Run migration**

```bash
npm run db:migrate
```

Expected: "Migration applied" or similar success message, no errors.

- [ ] **Step 4: Verify table exists**

```bash
npm run db:studio
```

Open Drizzle Studio in browser and confirm `cached_news` table is visible with all columns.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(db): add cached_news table for motorsport news"
```

---

## Task 2: Cheerio Scraper

**Files:**
- Create: `src/lib/scrapers/motorsportNews.ts`

**Interfaces:**
- Consumes: `cheerio` (already in package.json), `cachedNews` from `@/db/schema`, `db` from `@/db`
- Produces:
  ```typescript
  export async function fetchAndCacheNews(seriesSlug: string): Promise<void>
  ```

- [ ] **Step 1: Create scraper file**

Create `src/lib/scrapers/motorsportNews.ts`:

```typescript
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

// Extract up to 10 article URLs from a listing page
async function scrapeArticleUrls(listUrl: string): Promise<string[]> {
  const html = await fetchPage(listUrl);
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const urls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // Normalise: strip query/hash, ensure leading slash
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

// Extract full article content from an article page
async function scrapeArticle(url: string): Promise<ArticleData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Reliable: Open Graph meta tags
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    "";

  const imageUrl =
    $('meta[property="og:image"]').attr("content")?.trim() || null;

  const summary =
    $('meta[property="og:description"]').attr("content")?.trim() || null;

  // Published date
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

  // Author
  const author =
    $('[itemprop="author"] [itemprop="name"]').first().text().trim() ||
    $('[rel="author"]').first().text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    null;

  // Article body — try common selectors, collect non-empty paragraphs
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
      .filter((t) => t.length > 30); // skip nav/caption noise
    if (paras.length > 0) {
      content = paras.join("\n\n");
      break;
    }
  }

  return { title, imageUrl, summary, content, author, publishedAt };
}

export async function fetchAndCacheNews(seriesSlug: string): Promise<void> {
  const listUrl = SERIES_URLS[seriesSlug];
  if (!listUrl) return; // unsupported series — silent skip

  let articleUrls: string[];
  try {
    articleUrls = await scrapeArticleUrls(listUrl);
  } catch (err) {
    console.error(`[news] list scrape failed for ${seriesSlug}:`, err);
    return;
  }

  for (const url of articleUrls) {
    try {
      // Skip if already in DB
      const existing = await db.query.cachedNews.findFirst({
        where: eq(cachedNews.url, url),
        columns: { id: true },
      });
      if (existing) continue;

      await delay(500);

      const data = await scrapeArticle(url);
      if (!data.title) continue; // skip if we got nothing

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "D:/programs/Visual Studio Projects/Motorsports" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `motorsportNews.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scrapers/motorsportNews.ts
git commit -m "feat(scraper): add Cheerio-based motorsport.com news scraper"
```

---

## Task 3: Cache Functions + Cron Endpoint + Admin Action

**Files:**
- Modify: `src/lib/cache.ts`
- Create: `src/app/api/cron/news/route.ts`
- Modify: `src/app/(app)/admin/actions.ts`
- Modify: `src/app/(app)/admin/AdminPanel.tsx`

**Interfaces:**
- Consumes: `fetchAndCacheNews` from `@/lib/scrapers/motorsportNews`, `cachedNews` from `@/db/schema`
- Produces:
  ```typescript
  // cache.ts
  export const getCachedNews: (slug: string, limit?: number) => Promise<NewsItem[]>

  // Type exported for use in pages
  export type NewsItem = {
    id: string;
    seriesSlug: string;
    title: string;
    url: string;
    imageUrl: string | null;
    summary: string | null;
    content: string | null;
    author: string | null;
    publishedAt: Date | null;
    scrapedAt: Date;
  }

  // admin actions.ts
  export async function syncNewsAction(): Promise<{ ok: boolean; message: string }>
  ```

- [ ] **Step 1: Add cache functions to `src/lib/cache.ts`**

Add after the `getCachedRaceDetail` / `setCachedRaceDetail` block at the bottom of `src/lib/cache.ts`:

```typescript
// ─── News ─────────────────────────────────────────────────────────────────────

import { cachedNews } from "@/db/schema";

export type NewsItem = typeof cachedNews.$inferSelect;

export const getCachedNews = cache(async (
  slug: string,
  limit = 10
): Promise<NewsItem[]> => {
  return db.query.cachedNews.findMany({
    where: eq(cachedNews.seriesSlug, slug),
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
    limit,
  });
});

export const getAllCachedNews = cache(async (limit = 30): Promise<NewsItem[]> => {
  return db.query.cachedNews.findMany({
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
    limit,
  });
});

export async function getCachedNewsById(id: string): Promise<NewsItem | null> {
  const row = await db.query.cachedNews.findFirst({
    where: eq(cachedNews.id, id),
  });
  return row ?? null;
}
```

Note: `cachedNews` and `eq` are already imported at the top of cache.ts — add only if not already present.

- [ ] **Step 2: Check existing imports in cache.ts**

Open `src/lib/cache.ts` and verify:
- `import { db } from "@/db"` — already present
- `import { eq, and, sql } from "drizzle-orm"` — `eq` already present
- `import { cache } from "react"` — already present
- Add `cachedNews` to the destructured schema import line, e.g.:
  ```typescript
  import { cachedRaces, cachedStandings, cachedDrivers, cachedRaceDetails, cachedNews } from "@/db/schema";
  ```

- [ ] **Step 3: Create `/api/cron/news/route.ts`**

Create `src/app/api/cron/news/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { fetchAndCacheNews } from "@/lib/scrapers/motorsportNews";

const SUPPORTED_SERIES = ["f1", "motogp", "moto2", "wec"] as const;

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, string> = {};
  await Promise.allSettled(
    SUPPORTED_SERIES.map(async (slug) => {
      try {
        await fetchAndCacheNews(slug);
        results[slug] = "ok";
      } catch (err) {
        results[slug] = String(err);
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}
```

- [ ] **Step 4: Add `syncNewsAction` to admin actions**

Open `src/app/(app)/admin/actions.ts` and add at the end:

```typescript
import { fetchAndCacheNews } from "@/lib/scrapers/motorsportNews";

export async function syncNewsAction(): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  const slugs = ["f1", "motogp", "moto2", "wec"] as const;
  try {
    await Promise.allSettled(slugs.map(fetchAndCacheNews));
    return { ok: true, message: "Haberler sync edildi" };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}
```

- [ ] **Step 5: Add sync button to AdminPanel.tsx**

Open `src/app/(app)/admin/AdminPanel.tsx`.

Add `syncNewsAction` to the existing import:
```typescript
import { syncSeriesAction, clearRaceDetailAction, sendTestNotifAction, syncNewsAction } from "./actions";
```

Add state for news sync near the other `useTransition` calls:
```typescript
const [newsSyncPending, startNewsSyncTransition] = useTransition();
```

Add handler function after `handleNotif`:
```typescript
function handleNewsSync() {
  startNewsSyncTransition(async () => {
    const result = await syncNewsAction();
    addToast(result.ok, result.message);
  });
}
```

In the Sync tab JSX, add a "Haberleri Sync Et" button below the existing sync buttons section. Find the Sync tab content and add before its closing tag:

```tsx
<div className="mt-4 pt-4 border-t border-border">
  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-semibold">Haberler</p>
  <button
    onClick={handleNewsSync}
    disabled={newsSyncPending}
    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm hover:bg-white/5 disabled:opacity-50 transition-colors"
  >
    {newsSyncPending
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : <RefreshCw className="w-4 h-4" />}
    Haberleri Sync Et
  </button>
</div>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cache.ts src/app/api/cron/news/route.ts src/app/(app)/admin/actions.ts src/app/(app)/admin/AdminPanel.tsx
git commit -m "feat(news): add cache functions, cron endpoint, and admin sync button"
```

---

## Task 4: Bottom Nav + i18n + News List Page

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `messages/tr.json`
- Modify: `messages/en.json`
- Create: `src/app/(app)/news/page.tsx`
- Create: `src/app/(app)/news/loading.tsx`

**Interfaces:**
- Consumes: `getAllCachedNews`, `NewsItem` from `@/lib/cache`, `getSeriesConfig` from `@/lib/series-config`
- Produces: `/news` route accessible from bottom nav

- [ ] **Step 1: Add i18n keys**

In `messages/tr.json`, add to the `"nav"` object:
```json
"news": "Haberler"
```

Add new top-level `"newsPage"` object:
```json
"newsPage": {
  "title": "Haberler",
  "allSeries": "Tüm Seriler",
  "noNews": "Henüz haber yok. Admin panelden sync edin.",
  "readMore": "Devamını Oku",
  "by": "Yazar:",
  "source": "Kaynağa Git",
  "back": "Haberler"
}
```

In `messages/en.json`, add to `"nav"`:
```json
"news": "News"
```

Add top-level `"newsPage"`:
```json
"newsPage": {
  "title": "News",
  "allSeries": "All Series",
  "noNews": "No news yet. Sync from the admin panel.",
  "readMore": "Read More",
  "by": "By",
  "source": "View Source",
  "back": "News"
}
```

- [ ] **Step 2: Add "Haberler" tab to BottomNav**

Open `src/components/layout/BottomNav.tsx`.

Add `Newspaper` to the lucide-react import:
```typescript
import { CalendarDays, Grid2X2, Heart, Newspaper, Settings, Users } from "lucide-react";
```

Add the news item to `NAV_ITEMS` array (between Favorites and Settings):
```typescript
{ href: "/news", label: t("news"), icon: Newspaper },
```

The array should now be:
```typescript
const NAV_ITEMS = [
  { href: "/", label: t("calendar"), icon: CalendarDays },
  { href: "/series", label: t("series"), icon: Grid2X2 },
  { href: "/favorites", label: t("favorites"), icon: Heart },
  { href: "/news", label: t("news"), icon: Newspaper },
  { href: "/settings", label: t("settings"), icon: Settings },
];
```

- [ ] **Step 3: Create news list page**

Create `src/app/(app)/news/page.tsx`:

```tsx
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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>

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
                className="w-1 shrink-0 rounded-l-xl"
                style={{ backgroundColor: seriesColor }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 flex gap-3 p-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* Series badge + time */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wide"
                      style={{
                        color: seriesColor,
                        backgroundColor: `${seriesColor}20`,
                      }}
                    >
                      {seriesName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
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
```

- [ ] **Step 4: Create loading skeleton**

Create `src/app/(app)/news/loading.tsx`:

```tsx
export default function NewsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="h-8 w-32 bg-muted rounded animate-pulse mb-4" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex bg-card border border-border rounded-xl overflow-hidden h-24 animate-pulse">
            <div className="w-1 bg-muted rounded-l-xl" />
            <div className="flex-1 p-3 flex gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
              <div className="w-20 h-16 bg-muted rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add news image domain to next.config.ts**

Open `next.config.ts`. The scraper uses `meta[property="og:image"]` from motorsport.com. Images come from `cdn-*.motorsport.com`. Add:

```typescript
{ protocol: "https", hostname: "**cdn*.motorsport.com" },
{ protocol: "https", hostname: "motorsport.com" },
```

Note: wildcard subdomains require `**` prefix in Next.js remotePatterns.

- [ ] **Step 6: Verify TypeScript and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
```

```bash
git add src/components/layout/BottomNav.tsx messages/tr.json messages/en.json src/app/(app)/news/ next.config.ts
git commit -m "feat(news): add Haberler bottom nav tab and news list page"
```

---

## Task 5: Article Detail Page

**Files:**
- Create: `src/app/(app)/news/[id]/page.tsx`
- Create: `src/app/(app)/news/[id]/loading.tsx`

**Interfaces:**
- Consumes: `getCachedNewsById`, `NewsItem` from `@/lib/cache`, `getSeriesConfig` from `@/lib/series-config`

- [ ] **Step 1: Create article detail page**

Create `src/app/(app)/news/[id]/page.tsx`:

```tsx
import { getCachedNewsById } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, t] = await Promise.all([
    getCachedNewsById(id),
    getTranslations("newsPage"),
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
          {/* Gradient overlay for badge + title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Series badge over image */}
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
        {/* Title (when no hero image) */}
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
          <span>{formatDate(item.publishedAt)}</span>
        </div>

        {/* Summary / lead */}
        {item.summary && (
          <p className="text-base font-medium leading-relaxed text-foreground/90 border-l-2 pl-3" style={{ borderColor: seriesColor }}>
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
```

- [ ] **Step 2: Create loading skeleton**

Create `src/app/(app)/news/[id]/loading.tsx`:

```tsx
export default function NewsDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto pb-24 animate-pulse">
      <div className="px-4 pt-4">
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
      <div className="w-full aspect-video bg-muted mt-3" />
      <div className="px-4 mt-4 flex flex-col gap-4">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-6 w-full bg-muted rounded" />
        <div className="h-6 w-4/5 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-11/12 bg-muted rounded" />
            <div className="h-3 w-4/5 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/news/[id]/
git commit -m "feat(news): add article detail page with hero image and full content"
```

---

## Task 6: Series Page News Strip

**Files:**
- Modify: `src/app/(app)/[series]/page.tsx`

**Interfaces:**
- Consumes: `getCachedNews`, `NewsItem` from `@/lib/cache`

- [ ] **Step 1: Add news fetch to series page**

Open `src/app/(app)/[series]/page.tsx`.

Add `getCachedNews` to the cache import:
```typescript
import { getCachedSchedule, getCachedStandings, getCachedDrivers, getCachedNews } from "@/lib/cache";
```

In the `Promise.all` block, add `getCachedNews`:
```typescript
const [{ races }, { standings: driverStandings }, { standings: teamStandings }, { drivers }, news] = await Promise.all([
  getCachedSchedule(slug, year),
  getCachedStandings(slug, year, "driver"),
  getCachedStandings(slug, year, "team"),
  getCachedDrivers(slug),
  getCachedNews(slug, 5),
]);
```

- [ ] **Step 2: Add news strip JSX to series page**

In the series page JSX, add after the standings section (before the final `{races.length === 0 && ...}` block):

```tsx
{/* Son Haberler */}
{news.length > 0 && (
  <section className="mb-2">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Son Haberler
      </h3>
      <Link
        href="/news"
        className="text-xs hover:opacity-70 transition-opacity"
        style={{ color: config.color }}
      >
        Tümü
      </Link>
    </div>
    <div className="flex flex-col gap-2">
      {news.map((item) => (
        <Link
          key={item.id}
          href={`/news/${item.id}`}
          className="relative flex items-stretch bg-card border border-border rounded-xl overflow-hidden hover:bg-accent/30 transition-colors"
        >
          <div
            className="w-1 shrink-0 rounded-l-xl"
            style={{ backgroundColor: config.color }}
          />
          <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1">
            <p className="text-sm font-semibold leading-snug line-clamp-2">
              {item.title}
            </p>
            {item.author && (
              <p className="text-[10px] text-muted-foreground">{item.author}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit and push**

```bash
git add src/app/(app)/[series]/page.tsx
git commit -m "feat(news): add Son Haberler strip to series page"
git push
```

---

## Post-Deploy Steps

After CI/CD deploys:

1. Admin panelden "Haberleri Sync Et" butonuna bas
2. `/news` sayfasına git — haberler listelenmiş olmalı
3. Bir habere tıkla — detay sayfası açılmalı, içerik görünmeli
4. Seri sayfasına git (örn. `/f1`) — altta "Son Haberler" şeridi görünmeli

If images are broken (403 or not loading), open `next.config.ts` and check the `remotePatterns` for motorsport.com CDN. The actual CDN hostname can be inspected from any article's `og:image` URL — update accordingly.

If article content is empty (`paragraphs.length === 0`), the CSS selectors in `scrapeArticle()` need adjustment. Check the actual HTML structure of a motorsport.com article and update the `contentSelectors` array in `src/lib/scrapers/motorsportNews.ts`.
