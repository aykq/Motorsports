import cron from "node-cron";
import { eq, and } from "drizzle-orm";
import { syncSeries, syncScheduleOnly } from "@/lib/sync";
import { isActiveRaceWeekend, syncActiveSessionData, syncRaceDetails } from "@/lib/race-detail";
import { getCachedSchedule, getRaceDetailRaw } from "@/lib/cache";
import { adapters } from "@/lib/adapters";
import { db } from "@/db";
import { cachedRaces, sentNotifications } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import type { Race } from "@/types/series";

const POST_RACE_WINDOW_MS = 12 * 60 * 60 * 1000;

const SEASON = new Date().getFullYear();

// Sonuç bildirimi: seans başlangıcından bu kadar sonra kontrol et
// F1: ilgili DB flag'i (qualifyingComplete vs.) true olunca gönderilir
// Non-F1: live penceresi dolunca (race) veya minMs dolunca (diğerleri) gönderilir
const RESULTS_WINDOW: Record<string, { minMs: number; maxMs: number }> = {
  qualifying:  { minMs: 60 * 60 * 1000,       maxMs:  4 * 60 * 60 * 1000 },
  sprintQuali: { minMs: 30 * 60 * 1000,       maxMs:  2 * 60 * 60 * 1000 },
  sprint:      { minMs: 25 * 60 * 1000,       maxMs:  2 * 60 * 60 * 1000 },
  race:        { minMs: 90 * 60 * 1000,       maxMs: 32 * 60 * 60 * 1000 }, // 32h: Le Mans + buffer
};

// MotoGP API "FINISHED" ve TheSportsDB "FT" status'ünü DB'ye yazar;
// race.status === "completed" kontrolü time-based yerine kullanılır.
const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

const SESSION_LABELS: Record<string, string> = {
  practice1: "1. Antrenman",
  practice2: "2. Antrenman",
  practice3: "3. Antrenman",
  qualifying: "Sıralama Turları",
  sprintQuali: "Sprint Sıralama",
  sprint: "Sprint Yarışı",
  race: "Yarış",
};

const SESSION_ICONS: Record<string, string> = {
  practice1: "🔧",
  practice2: "🔧",
  practice3: "🔧",
  qualifying: "⏱️",
  sprintQuali: "⏱️",
  sprint: "💨",
  race: "🏁",
};

async function isNotifSent(
  seriesSlug: string,
  season: number,
  round: number,
  sessionType: string,
  notifType: string
): Promise<boolean> {
  const row = await db.query.sentNotifications.findFirst({
    where: and(
      eq(sentNotifications.seriesSlug, seriesSlug),
      eq(sentNotifications.season, season),
      eq(sentNotifications.round, round),
      eq(sentNotifications.sessionType, sessionType),
      eq(sentNotifications.notifType, notifType)
    ),
  });
  return !!row;
}

async function markNotifSent(
  seriesSlug: string,
  season: number,
  round: number,
  sessionType: string,
  notifType: string
): Promise<void> {
  await db
    .insert(sentNotifications)
    .values({ seriesSlug, season, round, sessionType, notifType })
    .onConflictDoNothing();
}

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

// Seans bildirimleri — her 5 dakikada bir kontrol
// :01, :06, :11... olarak ofsetlendi (00:00 yığılmasını önlemek için)
// Antrenman seanslarında ön bildirim yok.
// Sıralama / sprint / yarış: 1h önce, 15dk önce, başlangıç bildirimi.
// Sonuç bildirimleri: F1 için DB flag'i (data-driven), non-F1 için zaman bazlı.
cron.schedule(
  "1-59/5 * * * *",
  async () => {
    const now = Date.now();

    const preWindows = {
      pre_1h:  { start: now + 55 * 60 * 1000, end: now + 65 * 60 * 1000 },
      pre_15m: { start: now + 10 * 60 * 1000, end: now + 20 * 60 * 1000 },
      start:   { start: now -  2 * 60 * 1000, end: now +  3 * 60 * 1000 },
    };

    const isPractice = (type: string) =>
      type === "practice1" || type === "practice2" || type === "practice3";

    try {
      const allRaces = await db.query.cachedRaces.findMany();

      for (const row of allRaces) {
        const race = row.data as Race;

        for (const session of (race.sessions ?? [])) {
          const sessionTime = new Date(session.date).getTime();
          const label = SESSION_LABELS[session.type] ?? session.type;
          const icon  = SESSION_ICONS[session.type] ?? "🏎️";

          // ── Ön bildirimler (antrenman hariç) ─────────────────────────
          if (!isPractice(session.type)) {
            for (const [notifType, window] of Object.entries(preWindows)) {
              if (sessionTime < window.start || sessionTime > window.end) continue;

              const alreadySent = await isNotifSent(
                row.seriesSlug, row.season, race.round, session.type, notifType
              );
              if (alreadySent) continue;

              const title =
                notifType === "pre_1h"  ? `${icon} ${label} 1 saat sonra başlıyor` :
                notifType === "pre_15m" ? `${icon} ${label} 15 dakika sonra başlıyor` :
                                          `${icon} ${label} başladı!`;

              await sendPushToSubscribers(row.seriesSlug, {
                title,
                body: `${race.name} — ${race.circuitName}`,
                url: `/${row.seriesSlug}`,
              });
              await markNotifSent(row.seriesSlug, row.season, race.round, session.type, notifType);
              console.log(`[cron] notif sent: [${notifType}] ${row.seriesSlug} R${race.round} ${session.type}`);
            }
          }

          // ── Sonuç bildirimleri ────────────────────────────────────────
          const resWindow = RESULTS_WINDOW[session.type];
          if (!resWindow) continue;

          const elapsed = now - sessionTime;
          if (elapsed < resWindow.minMs || elapsed > resWindow.maxMs) continue;

          const alreadySent = await isNotifSent(
            row.seriesSlug, row.season, race.round, session.type, "results"
          );
          if (alreadySent) continue;

          let resultsReady = false;

          if (row.seriesSlug === "f1") {
            if (session.type === "race") {
              resultsReady = (race.results?.length ?? 0) >= 18;
            } else {
              const detail = await getRaceDetailRaw("f1", row.season, race.round);
              if (session.type === "qualifying")  resultsReady = !!detail?.qualifyingComplete;
              if (session.type === "sprintQuali") resultsReady = !!detail?.sprintQualiComplete;
              if (session.type === "sprint")      resultsReady = !!detail?.sprintComplete;
            }
          } else {
            if (session.type === "race") {
              if (STATUS_DRIVEN_SERIES.has(row.seriesSlug)) {
                // MotoGP/WEC: API status "FINISHED"/"FT" → DB "completed" → bildirim
                resultsReady = race.status === "completed";
              } else {
                // GT3/Carrera: live penceresi dolunca (zaman bazlı)
                const m = race.name.match(/(\d+)\s*hour/i);
                const liveWindowMs = m
                  ? (parseInt(m[1], 10) + 2) * 60 * 60 * 1000
                  : /endurance/i.test(race.name) ? 5 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
                resultsReady = elapsed > liveWindowMs;
              }
            } else {
              resultsReady = true; // sıralama / sprint: minMs dolunca gönder
            }
          }

          if (!resultsReady) continue;

          await sendPushToSubscribers(row.seriesSlug, {
            title: `${icon} ${label} Sonuçları Açıklandı`,
            body: `${race.name} — ${race.circuitName}`,
            url: `/${row.seriesSlug}/races/${race.round}`,
          });
          await markNotifSent(row.seriesSlug, row.season, race.round, session.type, "results");
          console.log(`[cron] notif sent: [results] ${row.seriesSlug} R${race.round} ${session.type}`);
        }
      }
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

console.log("[cron] scheduled: full sync @00/06/12/18 UTC, session notify @:01/06/11..., session sync @:02/04/06..., non-F1 status refresh @:03/13/23..., post-race refresh @:15/:45");
