"use server";

import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { and, count, gt, inArray, notInArray, sql } from "drizzle-orm";

// Rank by published_at to match the list; scraped_at lets old-dated backfills
// count as "new" forever because a refresh never surfaces them.
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
