import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { cachedNews } from "@/db/schema";
import { prewarmNewsImages } from "./news-image-prewarm";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("prewarmNewsImages", () => {
  it("hits the optimizer once per (image, width) through the given origin", async () => {
    await insertNews({ imageUrl: "https://cdn.motorsport.com/a.jpg" });
    await insertNews({ imageUrl: "https://cdn.motorsport.com/b.jpg" });
    await insertNews({ imageUrl: null }); // no image -> skipped

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(new ArrayBuffer(8), { status: 200 }));

    const result = await prewarmNewsImages("http://127.0.0.1:9999");

    expect(result).toEqual({ images: 2, warmed: 8, failed: 0 }); // 2 images x 4 widths
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContain(
      "http://127.0.0.1:9999/_next/image?url=https%3A%2F%2Fcdn.motorsport.com%2Fa.jpg&w=96&q=75",
    );
    expect(urls).toContain(
      "http://127.0.0.1:9999/_next/image?url=https%3A%2F%2Fcdn.motorsport.com%2Fa.jpg&w=256&q=75",
    );
    expect(urls.every((u) => u.startsWith("http://127.0.0.1:9999/_next/image?"))).toBe(true);
  });

  it("dedupes repeated image URLs", async () => {
    await insertNews({ imageUrl: "https://cdn.motorsport.com/same.jpg" });
    await insertNews({ imageUrl: "https://cdn.motorsport.com/same.jpg" });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const result = await prewarmNewsImages("http://127.0.0.1:9999");

    expect(result.images).toBe(1);
    expect(result.warmed).toBe(4);
  });

  it("counts non-ok responses and network errors as failures without throwing", async () => {
    await insertNews({ imageUrl: "https://cdn.motorsport.com/x.jpg" });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await prewarmNewsImages("http://127.0.0.1:9999");

    expect(result).toEqual({ images: 1, warmed: 2, failed: 2 }); // 4 widths: 500, err, 200, 200
  });
});
