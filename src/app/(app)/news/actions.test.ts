import { describe, it, expect, beforeEach } from "vitest";
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
      publishedAt: new Date(),
      ...overrides,
    })
    .returning({ id: cachedNews.id });
  return row.id;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

beforeEach(async () => {
  await db.delete(cachedNews);
});

describe("getNewNewsCountAction", () => {
  it("counts an unseen article published more recently than the oldest one shown", async () => {
    const shown = await insertNews({ publishedAt: daysAgo(2) });
    await insertNews({ publishedAt: daysAgo(1) }); // newer, not shown

    expect(await getNewNewsCountAction([shown])).toBe(1);
  });

  it("does NOT count a freshly-scraped article whose publish date predates the list", async () => {
    const shown = await insertNews({ publishedAt: daysAgo(1) });
    await insertNews({ publishedAt: daysAgo(8), scrapedAt: new Date() });

    expect(await getNewNewsCountAction([shown])).toBe(0);
  });

  it("does not count articles already on screen, even the newest", async () => {
    const older = await insertNews({ publishedAt: daysAgo(2) });
    const newest = await insertNews({ publishedAt: daysAgo(1) });

    expect(await getNewNewsCountAction([newest, older])).toBe(0);
  });

  it("returns 0 when nothing is newer than the list", async () => {
    const a = await insertNews({ publishedAt: daysAgo(3) });
    const b = await insertNews({ publishedAt: daysAgo(2) });
    await insertNews({ publishedAt: daysAgo(5) }); // older, not shown

    expect(await getNewNewsCountAction([a, b])).toBe(0);
  });

  it("returns 0 for an empty displayed set", async () => {
    await insertNews({ publishedAt: new Date() });

    expect(await getNewNewsCountAction([])).toBe(0);
  });
});
