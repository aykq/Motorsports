import { getAllCachedNews } from "@/lib/cache";

// News hero images are stored as the source `og:image` (~1200px, 100-300 KB).
// The /news list renders them as 80px thumbnails and the detail page as a
// full-width hero, so Next's optimizer has to pull the whole file from the
// source CDN and resize it on first view. Right after a scrape that means the
// first real visitor pays a cold CDN fetch + sharp resize for every new
// article. Warming the optimizer cache here (it runs in-process, on the cron
// path, not a user request) turns that into a disk cache hit.
//
// A fixed-px `sizes` with no `vw` makes Next put every configured width in the
// srcset (see get-img-props.ts getWidths), so the browser picks by DPR:
//   /news thumbnail (sizes="80px"): 80*DPR -> 96 (1x), 128 (1.5x), 256 (2x/3x)
//   detail hero (sizes="...100vw, 672px"): ~1200 covers most phones
// q=75 is the Next default and the only configured quality. Keep in sync with
// next.config images.{imageSizes,deviceSizes,qualities}.
const WARM_WIDTHS = [96, 128, 256, 1200] as const;
const CONCURRENCY = 4;
const PER_IMAGE_TIMEOUT_MS = 20_000;

function optimizerOrigin(): string {
  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

export async function prewarmNewsImages(
  origin: string = optimizerOrigin(),
): Promise<{ images: number; warmed: number; failed: number }> {
  const news = await getAllCachedNews(50);
  const imageUrls = [
    ...new Set(news.map((n) => n.imageUrl).filter((u): u is string => !!u)),
  ];

  const jobs = imageUrls.flatMap((imageUrl) =>
    WARM_WIDTHS.map((w) => async () => {
      try {
        const res = await fetch(
          `${origin}/_next/image?url=${encodeURIComponent(imageUrl)}&w=${w}&q=75`,
          {
            headers: { accept: "image/webp,image/*,*/*;q=0.8" },
            signal: AbortSignal.timeout(PER_IMAGE_TIMEOUT_MS),
          },
        );
        // Drain the body so the optimize-and-cache pipeline runs to completion.
        await res.arrayBuffer().catch(() => undefined);
        return res.ok;
      } catch {
        return false;
      }
    }),
  );

  let warmed = 0;
  let failed = 0;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = await Promise.all(jobs.slice(i, i + CONCURRENCY).map((run) => run()));
    for (const ok of batch) {
      if (ok) warmed++;
      else failed++;
    }
  }

  return { images: imageUrls.length, warmed, failed };
}
