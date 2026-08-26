// SADECE LOCAL GELİŞTİRME. Production'da bu dosya yüklenmez (bkz.
// instrumentation.ts) — orada zamanlama sunucudaki crontab + cron container'ı
// üzerinden /api/cron/* route'larına yapılır. Buraya yeni bir iş eklersen
// prod'da da çalışması için karşılık gelen route'u ve crontab satırını ekle.
import cron from "node-cron";
import { syncSeries, syncScheduleOnly } from "@/lib/sync";
import { isActiveRaceWeekend, syncActiveSessionData, syncRaceDetails } from "@/lib/race-detail";
import { getCachedSchedule } from "@/lib/cache";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { notifySessions } from "@/lib/notify-sessions";
import { fetchAndCacheNews, cleanAllNewsContent } from "@/lib/scrapers/motorsportNews";
import type { Race } from "@/types/series";
import { logError } from "@/lib/error-log";
import { getShowNonF1Series } from "@/lib/app-settings";

const POST_RACE_WINDOW_MS = 12 * 60 * 60 * 1000;
const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

const SEASON = new Date().getFullYear();

// Tam veri sync — her 6 saatte bir (00, 06, 12, 18 UTC)
cron.schedule(
  "0 */6 * * *",
  async () => {
    console.log("[cron] full sync started");
    const showNonF1 = await getShowNonF1Series();
    const slugsToSync = showNonF1 ? Object.keys(adapters) : Object.keys(adapters).filter((s) => s === "f1");
    for (const slug of slugsToSync) {
      try {
        const result = await syncSeries(slug, SEASON);
        console.log(`[cron] ${slug}: ${result.racesCount} races, ${result.driversCount} drivers`);
        if (result.errors.length) logError({ source: "cron.ts/full-sync", severity: "warning", message: `${slug}: ${result.errors.join("; ")}` });
      } catch (err) {
        logError({ source: "cron.ts/full-sync", severity: "error", message: `${slug}: ${err instanceof Error ? err.message : String(err)}` });
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
        if (detailResult.errors.length) logError({ source: "cron.ts/race-details", severity: "warning", message: detailResult.errors.join("; ") });
      }
    } catch (err) {
      logError({ source: "cron.ts/race-details", severity: "error", message: err instanceof Error ? err.message : String(err) });
    }

    console.log("[cron] full sync finished");
  },
  { timezone: "UTC" }
);

// Seans bildirimleri — her 5 dakikada bir
// Antrenman hariç: 1h önce, 15dk önce, başlangıç + sonuç bildirimleri
cron.schedule(
  "*/5 * * * *",
  async () => {
    try {
      const result = await notifySessions();
      if (result.sent.length) console.log("[cron] notif sent:", result.sent);
      if (result.errors.length) logError({ source: "cron.ts/notify", severity: "warning", message: result.errors.join("; ") });
    } catch (err) {
      logError({ source: "cron.ts/notify", severity: "error", message: err instanceof Error ? err.message : String(err) });
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
    const showNonF1 = await getShowNonF1Series();

    const activeRows = allRows.filter(
      (row) => (showNonF1 || row.seriesSlug === "f1") && isActiveRaceWeekend(row.data as Race)
    );
    if (!activeRows.length) return;

    for (const row of activeRows) {
      try {
        await syncActiveSessionData(row.seriesSlug, season, row.data as Race);
      } catch (err) {
        logError({ source: "cron.ts/session-sync", severity: "error", message: `${row.seriesSlug} R${(row.data as Race).round}: ${err instanceof Error ? err.message : String(err)}` });
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
    if (!(await getShowNonF1Series())) return;

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
        logError({ source: "cron.ts/status-refresh", severity: "error", message: `${slug}: ${err instanceof Error ? err.message : String(err)}` });
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

    const showNonF1 = await getShowNonF1Series();
    const slugs = [...new Set(needsRefresh.map((r) => r.seriesSlug))].filter(
      (s) => showNonF1 || s === "f1"
    );
    if (!slugs.length) return;
    console.log(`[cron] post-race results refresh: ${slugs.join(", ")}`);
    const season = new Date().getFullYear();
    for (const slug of slugs) {
      try {
        await syncSeries(slug, season);
      } catch (err) {
        logError({ source: "cron.ts/post-race-sync", severity: "error", message: `${slug}: ${err instanceof Error ? err.message : String(err)}` });
      }
    }
  },
  { timezone: "UTC" }
);

// Haber fetch — her 2 saatte bir (:30 offsetli, full sync ile örtüşmez)
const NEWS_SERIES = ["f1", "motogp", "moto2", "wec"] as const;
cron.schedule(
  "30 */2 * * *",
  async () => {
    console.log("[cron] news fetch started");
    const showNonF1 = await getShowNonF1Series();
    const seriesToFetch = showNonF1 ? NEWS_SERIES : NEWS_SERIES.filter((s) => s === "f1");
    const results = await Promise.allSettled(seriesToFetch.map(fetchAndCacheNews));
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const { urlsFound, inserted } = r.value;
        if (inserted > 0) console.log(`[cron] news ${seriesToFetch[i]}: +${inserted}/${urlsFound}`);
      } else {
        logError({ source: "cron.ts/news", severity: "warning", message: `${seriesToFetch[i]}: ${String(r.reason)}` });
      }
    });
    const cleanedCount = await cleanAllNewsContent();
    if (cleanedCount > 0) console.log(`[cron] news content cleaned: ${cleanedCount} items`);
    // No revalidateTag() here: it requires Next's request-scoped store, which a bare
    // node-cron timer callback never has (unlike /api/cron/news/route.ts's Route Handler,
    // used in prod) — the news cache still expires on its own 1800s revalidate window.
    console.log("[cron] news fetch finished");
  },
  { timezone: "UTC" }
);

console.log("[cron] scheduled: full sync @00/06/12/18 UTC, session notify @every 5 min, session sync @:02/04/06..., status refresh @:03/13/23..., post-race refresh @:15/:45, news fetch @:30 every 2h");
