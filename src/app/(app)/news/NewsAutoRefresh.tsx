"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 60_000;

// Re-runs the server component's data fetch periodically so freshly-scraped news
// (cron sync every 2h, or an admin's manual sync) show up without an F5. Cheap:
// getAllCachedNews is a tagged unstable_cache, so this only re-hits the DB when
// the "news" tag was actually invalidated — otherwise it's served from cache.
export function NewsAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
