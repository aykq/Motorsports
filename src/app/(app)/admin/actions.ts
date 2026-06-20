"use server";

import { db } from "@/db";
import { cachedRaceDetails, cachedRaces } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { syncSeries } from "@/lib/sync";
import { sendPushToSubscribers } from "@/lib/push";
import { requireAdmin } from "@/lib/admin-guard";
import { fetchAndCacheNews } from "@/lib/scrapers/motorsportNews";

async function checkAdmin() {
  const adminId = await requireAdmin();
  if (!adminId) throw new Error("Unauthorized");
}

export async function syncSeriesAction(slug: string): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  const year = new Date().getFullYear();
  try {
    const result = await syncSeries(slug, year);
    const msg = `${result.racesCount} races, ${result.driversCount} drivers, ${result.raceDetailsSynced} details`;
    return { ok: true, message: msg };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function clearRaceDetailAction(
  slug: string,
  round: number
): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  const year = new Date().getFullYear();
  try {
    await db
      .delete(cachedRaceDetails)
      .where(
        and(
          eq(cachedRaceDetails.seriesSlug, slug),
          eq(cachedRaceDetails.season, year),
          eq(cachedRaceDetails.round, round)
        )
      );
    return { ok: true, message: `Race detail cleared for ${slug} R${round}` };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function sendTestNotifAction(
  slug: string,
  title: string,
  body: string
): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  try {
    await sendPushToSubscribers(slug, null, { title, body, url: `/${slug}` });
    return { ok: true, message: `Notification sent to ${slug} subscribers` };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function createNewsTableAction(): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cached_news" (
        "id" text PRIMARY KEY NOT NULL,
        "series_slug" text NOT NULL,
        "title" text NOT NULL,
        "url" text NOT NULL,
        "image_url" text,
        "summary" text,
        "content" text,
        "author" text,
        "published_at" timestamp,
        "scraped_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "cached_news_url_idx"
      ON "cached_news" USING btree ("url")
    `);
    return { ok: true, message: "cached_news tablosu hazır" };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function syncNewsAction(): Promise<{ ok: boolean; message: string }> {
  await checkAdmin();
  const slugs = ["f1", "motogp", "moto2", "wec"] as const;
  const results = await Promise.allSettled(slugs.map(fetchAndCacheNews));
  const lines: string[] = [];
  results.forEach((r, i) => {
    const slug = slugs[i];
    if (r.status === "fulfilled") {
      const { urlsFound, inserted, skipped, errors } = r.value;
      lines.push(`${slug}: ${urlsFound} URL, +${inserted} kayıt, ${skipped} mevcut${errors.length ? `, hata: ${errors[0]}` : ""}`);
    } else {
      lines.push(`${slug}: HATA — ${r.reason}`);
    }
  });
  return { ok: true, message: lines.join("\n") };
}

export async function getLastSyncTimesAction(): Promise<Record<string, string | null>> {
  await checkAdmin();
  const rows = await db.query.cachedRaces.findMany();
  const bySlug: Record<string, Date | null> = {};
  for (const row of rows) {
    const prev = bySlug[row.seriesSlug];
    if (!prev || row.fetchedAt > prev) {
      bySlug[row.seriesSlug] = row.fetchedAt;
    }
  }
  return Object.fromEntries(
    Object.entries(bySlug).map(([slug, d]) => [slug, d ? d.toISOString() : null])
  );
}
