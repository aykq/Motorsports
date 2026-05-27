import cron from "node-cron";
import { syncSeries } from "@/lib/sync";
import { syncRaceDetails } from "@/lib/race-detail";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { cachedRaces } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import type { Race } from "@/types/series";

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;
const POST_RACE_WINDOW_MS = 12 * 60 * 60 * 1000;

const SEASON = new Date().getFullYear();

// Tam veri sync — her 6 saatte bir (00, 06, 12, 18 UTC)
cron.schedule(
  "0 */6 * * *",
  async () => {
    console.log("[cron] full sync started");
    for (const slug of Object.keys(adapters)) {
      try {
        const result = await syncSeries(slug, SEASON);
        console.log(`[cron] ${slug}: ${result.racesCount} races, ${result.driversCount} drivers`);
        if (result.errors.length) console.error(`[cron] ${slug} errors:`, result.errors);
      } catch (err) {
        console.error(`[cron] ${slug} failed:`, err);
      }
    }
    console.log("[cron] full sync finished");
  },
  { timezone: "UTC" }
);

// Pre-race bildirim — her 5 dakikada bir kontrol, yarıştan ~1 saat önce gönder
cron.schedule(
  "*/5 * * * *",
  async () => {
    const now = Date.now();
    const windowStart = now + 55 * 60 * 1000; // 55 dk sonra
    const windowEnd = now + 65 * 60 * 1000;   // 65 dk sonra

    try {
      const allRaces = await db.query.cachedRaces.findMany();

      for (const row of allRaces) {
        const race = row.data as Race;
        const raceSession = race.sessions?.find((s) => s.type === "race");
        if (!raceSession) continue;

        const raceTime = new Date(raceSession.date).getTime();
        if (raceTime >= windowStart && raceTime <= windowEnd) {
          await sendPushToSubscribers(row.seriesSlug, {
            title: `🏁 ${race.name} 1 saat sonra başlıyor!`,
            body: `${race.circuitName} — ${race.location}`,
            url: `/${row.seriesSlug}`,
          });
          console.log(`[cron] notification sent: ${row.seriesSlug} - ${race.name}`);
        }
      }
    } catch (err) {
      console.error("[cron] pre-race notification error:", err);
    }
  },
  { timezone: "UTC" }
);

// Yarış anı sync — her 5 dakikada bir, live yarış varsa race detail güncelle
cron.schedule(
  "*/5 * * * *",
  async () => {
    const now = Date.now();
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);

    const liveRows = allRows.filter((row) => {
      const race = row.data as Race;
      const raceSession = race.sessions?.find((s) => s.type === "race");
      if (!raceSession) return false;
      const raceTime = new Date(raceSession.date).getTime();
      return raceTime <= now && raceTime > now - LIVE_WINDOW_MS;
    });

    if (!liveRows.length) return;

    const bySlug = new Map<string, Race[]>();
    for (const row of liveRows) {
      const list = bySlug.get(row.seriesSlug) ?? [];
      list.push(row.data as Race);
      bySlug.set(row.seriesSlug, list);
    }

    console.log(`[cron] live race detected: ${[...bySlug.keys()].join(", ")}`);
    const season = new Date().getFullYear();
    for (const [slug, races] of bySlug) {
      try {
        await syncRaceDetails(slug, season, races);
      } catch (err) {
        console.error(`[cron] live sync error (${slug}):`, err);
      }
    }
  },
  { timezone: "UTC" }
);

// Yarış sonrası sonuç yenileme — her 30 dakikada bir
// Yarıştan 3-12 saat sonra eksik sonuç (< 15 pilot) varsa tam sync tetikler
cron.schedule(
  "*/30 * * * *",
  async () => {
    const now = Date.now();
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);

    const needsRefresh = allRows.filter((row) => {
      const race = row.data as Race;
      const raceSession = race.sessions?.find((s) => s.type === "race");
      if (!raceSession) return false;
      const raceTime = new Date(raceSession.date).getTime();
      const isPostRace =
        raceTime <= now - LIVE_WINDOW_MS &&
        raceTime > now - POST_RACE_WINDOW_MS;
      const hasIncompleteResults = !race.results || race.results.length < 15;
      return isPostRace && hasIncompleteResults;
    });

    if (!needsRefresh.length) return;

    const slugs = [...new Set(needsRefresh.map((r) => r.seriesSlug))];
    console.log(`[cron] post-race results refresh: ${slugs.join(", ")}`);
    const season = new Date().getFullYear();
    for (const slug of slugs) {
      try {
        await syncSeries(slug, season);
      } catch (err) {
        console.error(`[cron] post-race sync error (${slug}):`, err);
      }
    }
  },
  { timezone: "UTC" }
);

console.log("[cron] scheduled: full sync every 6h, post-race refresh every 30min, live race sync every 5min, pre-race notifications every 5min");
