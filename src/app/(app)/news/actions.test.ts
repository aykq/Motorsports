import { describe, it, expect, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { getNewNewsCountAction } from "./actions";

async function insertNews(
  overrides: Partial<typeof cachedNews.$inferInsert> = {},
): Promise<string> {
  const [row] = await db
    .insert(cachedNews)
    .values({
      seriesSlug: "f1",
      title: "Test article",
      url: `https://example.com/${crypto.randomUUID()}`,
      ...overrides,
    })
    .returning({ id: cachedNews.id });
  return row.id;
}

beforeEach(async () => {
  await db.delete(cachedNews);
});

describe("getNewNewsCountAction", () => {
  it("does not count articles that are already on screen, even the newest one", async () => {
    // Regression: the cursor used to be a millisecond-truncated ISO string, so
    // the newest row's own (microsecond-precision) scraped_at always compared
    // as "newer" and the badge never cleared.
    const older = await insertNews({ scrapedAt: new Date(Date.now() - 60_000) });
    const newest = await insertNews({ scrapedAt: new Date() });

    const count = await getNewNewsCountAction([newest, older]);

    expect(count).toBe(0);
  });

  it("counts rows scraped after the freshest displayed row and not already shown", async () => {
    const displayed = await insertNews({ scrapedAt: new Date(Date.now() - 60_000) });
    await insertNews({ scrapedAt: new Date() }); // scraped later, not in displayed set

    const count = await getNewNewsCountAction([displayed]);

    expect(count).toBe(1);
  });

  it("returns 0 when nothing has been scraped since the displayed set", async () => {
    const a = await insertNews({ scrapedAt: new Date(Date.now() - 120_000) });
    const b = await insertNews({ scrapedAt: new Date(Date.now() - 60_000) });

    const count = await getNewNewsCountAction([a, b]);

    expect(count).toBe(0);
  });

  it("is not fooled by sub-millisecond precision on the newest displayed row", async () => {
    // The old ISO-string cursor lost microseconds via Date.getTime(), so a row
    // whose scraped_at carried microseconds always compared as newer than the
    // cursor derived from it. Force real microsecond precision here.
    const newest = await insertNews();
    await db
      .update(cachedNews)
      .set({ scrapedAt: sql`timestamp '2026-08-28 10:00:00.175102'` })
      .where(eq(cachedNews.id, newest));

    const count = await getNewNewsCountAction([newest]);

    expect(count).toBe(0);
  });

  it("returns 0 for an empty displayed set", async () => {
    await insertNews({ scrapedAt: new Date() });

    const count = await getNewNewsCountAction([]);

    expect(count).toBe(0);
  });
});
