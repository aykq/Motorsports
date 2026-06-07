import cron from "node-cron";
import { syncSeries } from "@/lib/sync";
import { isActiveRaceWeekend, syncActiveSessionData, syncRaceDetails } from "@/lib/race-detail";
import { getCachedSchedule } from "@/lib/cache";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { cachedRaces } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import type { Race } from "@/types/series";

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
    // F1 race details backfill — son 14 gündeki tamamlanmış yarışlar için race control + çeviri kontrol
    try {
      const { races } = await getCachedSchedule("f1", SEASON);
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentCompleted = races.filter(
        (r) => r.status === "completed" && new Date(r.date).getTime() > fourteenDaysAgo
      );
      if (recentCompleted.length) {
        const detailResult = await syncRaceDetails("f1", SEASON, recentCompleted);
        if (detailResult.synced) console.log(`[cron] race details: ${detailResult.synced} updated`);
        if (detailResult.errors.length) console.error("[cron] race detail errors:", detailResult.errors);
      }
    } catch (err) {
      console.error("[cron] race details backfill error:", err);
    }

    console.log("[cron] full sync finished");
  },
  { timezone: "UTC" }
);

// Pre-race bildirim — her 5 dakikada bir kontrol, yarıştan ~1 saat önce gönder
// :01, :06, :11... olarak ofsetlendi (00:00 yığılmasını önlemek için)
cron.schedule(
  "1-59/5 * * * *",
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

// Aktif seans sync — her 2 dakikada bir
// FP1/2/3, qualifying, sprint ve yarış seanslarını tüm hafta sonu izler
// :02, :04, :06... — full sync :00 ile örtüşmez
cron.schedule(
  "2-58/2 * * * *",
  async () => {
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);
    const season = new Date().getFullYear();

    const activeRows = allRows.filter((row) =>
      isActiveRaceWeekend(row.data as Race)
    );
    if (!activeRows.length) return;

    for (const row of activeRows) {
      try {
        await syncActiveSessionData(row.seriesSlug, season, row.data as Race);
      } catch (err) {
        console.error(`[cron] session sync error (${row.seriesSlug} R${(row.data as Race).round}):`, err);
      }
    }
  },
  { timezone: "UTC" }
);

// Yarış sonrası sonuç yenileme — her 30 dakikada bir
// :15, :45 olarak ofsetlendi (00/30 yığılmasını önlemek için)
cron.schedule(
  "15,45 * * * *",
  async () => {
    const now = Date.now();
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);

    const needsRefresh = allRows.filter((row) => {
      const race = row.data as Race;
      const raceSession = race.sessions?.find((s) => s.type === "race");
      if (!raceSession) return false;
      const raceTime = new Date(raceSession.date).getTime();
      const isPostRace =
        raceTime <= now - 3 * 60 * 60 * 1000 &&
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

console.log("[cron] scheduled: full sync @00/06/12/18 UTC, pre-race notify @:01/06/11..., session sync @:02/04/06..., post-race refresh @:15/:45");
