"use server";

import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { and, count, gt, inArray, notInArray, sql } from "drizzle-orm";

// Counts articles that have been scraped since the freshest one the reader is
// currently looking at and aren't already in their list. Takes the displayed
// row ids (not a timestamp) so the comparison stays in Postgres at full
// precision — a JS Date cursor truncated microseconds and made the newest
// on-screen row count as "new" forever.
export async function getNewNewsCountAction(displayedIds: string[]): Promise<number> {
  if (displayedIds.length === 0) return 0;

  const freshestDisplayed = sql`(select max(${cachedNews.scrapedAt}) from ${cachedNews} where ${inArray(
    cachedNews.id,
    displayedIds,
  )})`;

  const rows = await db
    .select({ count: count() })
    .from(cachedNews)
    .where(
      and(
        notInArray(cachedNews.id, displayedIds),
        gt(cachedNews.scrapedAt, freshestDisplayed),
      ),
    );

  return rows[0]?.count ?? 0;
}
