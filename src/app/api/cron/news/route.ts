import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { fetchAndCacheNews } from "@/lib/scrapers/motorsportNews";
import { getShowNonF1Series } from "@/lib/app-settings";
import { prewarmNewsImages } from "@/lib/news-image-prewarm";

const SUPPORTED_SERIES = ["f1", "motogp", "moto2", "wec"] as const;

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const showNonF1 = await getShowNonF1Series();
  const seriesToFetch = showNonF1 ? SUPPORTED_SERIES : SUPPORTED_SERIES.filter((s) => s === "f1");

  const results: Record<string, string> = {};
  await Promise.allSettled(
    seriesToFetch.map(async (slug) => {
      try {
        await fetchAndCacheNews(slug);
        results[slug] = "ok";
      } catch (err) {
        results[slug] = String(err);
      }
    })
  );

  // News reads are no longer cross-request cached (see src/lib/cache.ts), so
  // there is no tag to revalidate — fresh rows land on the next page render.

  // Warm the image optimizer cache for the images the /news list will render,
  // so the first visitor after this scrape gets a disk hit instead of a cold
  // CDN fetch + resize. Never let a warm failure fail the cron.
  const prewarm = await prewarmNewsImages().catch(() => null);

  return NextResponse.json({ ok: true, results, prewarm });
}
