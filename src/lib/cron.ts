import cron from "node-cron";
import { syncSeries, syncScheduleOnly } from "@/lib/sync";
import { isActiveRaceWeekend, syncActiveSessionData, syncRaceDetails } from "@/lib/race-detail";
import { getCachedSchedule } from "@/lib/cache";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { notifySessions } from "@/lib/notify-sessions";
import type { Race } from "@/types/series";

const POST_RACE_WINDOW_MS = 12 * 60 * 60 * 1000;
const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

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

// Seans bildirimleri — her 5 dakikada bir
// Antrenman hariç: 1h önce, 15dk önce, başlangıç + sonuç bildirimleri
cron.schedule(
  "1-59/5 * * * *",
  async () => {
    try {
      const result = await notifySessions();
      if (result.sent.length) console.log("[cron] notif sent:", result.sent);
      if (result.errors.length) console.error("[cron] notif errors:", result.errors);
    } catch (err) {
      console.error("[cron] session notification error:", err);
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

// Non-F1 aktif yarış haftası status refresh — her 10 dakikada bir
// MotoGP API "FINISHED" / TheSportsDB "FT" → DB "completed" → bildirim cron'u yakalar
// :03, :13, :23... — diğer cron'larla örtüşmez
cron.schedule(
  "3-59/10 * * * *",
  async () => {
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);
    const season = new Date().getFullYear();

    const activeSlugs = [...new Set(
      allRows
        .filter((row) =>
          STATUS_DRIVEN_SERIES.has(row.seriesSlug) &&
          isActiveRaceWeekend(row.data as Race)
        )
        .map((row) => row.seriesSlug)
    )];

    if (!activeSlugs.length) return;

    for (const slug of activeSlugs) {
      try {
        await syncScheduleOnly(slug, season);
        console.log(`[cron] status refresh: ${slug}`);
      } catch (err) {
        console.error(`[cron] status refresh error (${slug}):`, err);
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

console.log("[cron] scheduled: full sync @00/06/12/18 UTC, session notify @:01/06/11..., session sync @:02/04/06..., status refresh @:03/13/23..., post-race refresh @:15/:45");
