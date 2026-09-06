"use server";

import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { and, count, gt, inArray, notInArray, sql } from "drizzle-orm";

// The news list is ordered by published_at, so "new" means an unseen article
// whose publish date is newer than the oldest one currently shown — i.e. one a
// refresh would actually pull into the list. Comparing scraped_at instead let a
// freshly-scraped but old-dated article (e.g. a MotoGP backfill) count as new
// forever, because a refresh never surfaced it and the badge never cleared.
export async function getNewNewsCountAction(displayedIds: string[]): Promise<number> {
  if (displayedIds.length === 0) return 0;

  const oldestDisplayed = sql`(select min(${cachedNews.publishedAt}) from ${cachedNews} where ${inArray(
    cachedNews.id,
    displayedIds,
  )})`;

  const rows = await db
    .select({ count: count() })
    .from(cachedNews)
    .where(
      and(
        notInArray(cachedNews.id, displayedIds),
        gt(cachedNews.publishedAt, oldestDisplayed),
      ),
    );

  return rows[0]?.count ?? 0;
}
