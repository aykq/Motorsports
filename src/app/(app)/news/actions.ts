"use server";

import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { count, gt } from "drizzle-orm";

export async function getNewNewsCountAction(sinceIso: string): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(cachedNews)
    .where(gt(cachedNews.scrapedAt, new Date(sinceIso)));
  return rows[0]?.count ?? 0;
}
