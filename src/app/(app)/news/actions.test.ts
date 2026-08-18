import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { getNewNewsCountAction } from "./actions";

async function insertNews(overrides: Partial<typeof cachedNews.$inferInsert> = {}) {
  await db.insert(cachedNews).values({
    seriesSlug: "f1",
    title: "Test article",
    url: `https://example.com/${crypto.randomUUID()}`,
    ...overrides,
  });
}

beforeEach(async () => {
  await db.delete(cachedNews);
});

describe("getNewNewsCountAction", () => {
  it("counts news rows scraped after the given cursor", async () => {
    const cursor = new Date();
    await insertNews({ scrapedAt: new Date(cursor.getTime() - 60_000) });
    await insertNews({ scrapedAt: new Date(cursor.getTime() + 60_000) });

    const count = await getNewNewsCountAction(cursor.toISOString());

    expect(count).toBe(1);
  });

  it("returns 0 when nothing is newer than the cursor", async () => {
    const cursor = new Date();
    await insertNews({ scrapedAt: new Date(cursor.getTime() - 60_000) });

    const count = await getNewNewsCountAction(cursor.toISOString());

    expect(count).toBe(0);
  });
});
