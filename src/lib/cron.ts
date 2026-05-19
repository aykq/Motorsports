import cron from "node-cron";
import { syncSeries } from "@/lib/sync";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { cachedRaces } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import type { Race } from "@/types/series";

const SEASON = new Date().getFullYear();

// Günlük veri sync — her gün 06:00 UTC
cron.schedule(
  "0 6 * * *",
  async () => {
    console.log("[cron] daily sync started");
    for (const slug of Object.keys(adapters)) {
      try {
        const result = await syncSeries(slug, SEASON);
        console.log(`[cron] ${slug}: ${result.racesCount} races, ${result.driversCount} drivers`);
        if (result.errors.length) console.error(`[cron] ${slug} errors:`, result.errors);
      } catch (err) {
        console.error(`[cron] ${slug} failed:`, err);
      }
    }
    console.log("[cron] daily sync finished");
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

console.log("[cron] scheduled: daily sync at 06:00 UTC, pre-race notifications every 5 min");
