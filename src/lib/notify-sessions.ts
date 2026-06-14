import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sentNotifications } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import { getRaceDetailRaw } from "@/lib/cache";
import type { Race } from "@/types/series";

const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

const RESULTS_WINDOW: Record<string, { minMs: number; maxMs: number }> = {
  qualifying:  { minMs: 60 * 60 * 1000,       maxMs:  4 * 60 * 60 * 1000 },
  sprintQuali: { minMs: 30 * 60 * 1000,       maxMs:  2 * 60 * 60 * 1000 },
  sprint:      { minMs: 25 * 60 * 1000,       maxMs:  2 * 60 * 60 * 1000 },
  race:        { minMs: 90 * 60 * 1000,       maxMs: 32 * 60 * 60 * 1000 },
};

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
  seriesSlug: string, season: number, round: number,
  sessionType: string, notifType: string
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
  seriesSlug: string, season: number, round: number,
  sessionType: string, notifType: string
): Promise<void> {
  await db
    .insert(sentNotifications)
    .values({ seriesSlug, season, round, sessionType, notifType })
    .onConflictDoNothing();
}

export interface NotifySessionsResult {
  sent: string[];
  errors: string[];
}

export async function notifySessions(): Promise<NotifySessionsResult> {
  const now = Date.now();
  const sent: string[] = [];
  const errors: string[] = [];

  const preWindows = {
    pre_1h:  { start: now + 55 * 60 * 1000, end: now + 65 * 60 * 1000 },
    pre_15m: { start: now + 10 * 60 * 1000, end: now + 20 * 60 * 1000 },
    start:   { start: now -  2 * 60 * 1000, end: now +  3 * 60 * 1000 },
  };

  const isPractice = (type: string) =>
    type === "practice1" || type === "practice2" || type === "practice3";

  const allRaces = await db.query.cachedRaces.findMany();

  for (const row of allRaces) {
    const race = row.data as Race;

    for (const session of (race.sessions ?? [])) {
      const sessionTime = new Date(session.date).getTime();
      const label = SESSION_LABELS[session.type] ?? session.type;
      const icon  = SESSION_ICONS[session.type] ?? "🏎️";
      const tag   = `[${row.seriesSlug} R${race.round} ${session.type}]`;

      // Pre-race notifications (no practice alerts)
      if (!isPractice(session.type)) {
        for (const [notifType, window] of Object.entries(preWindows)) {
          if (sessionTime < window.start || sessionTime > window.end) continue;

          try {
            if (await isNotifSent(row.seriesSlug, row.season, race.round, session.type, notifType)) continue;

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
            sent.push(`${tag} ${notifType}`);
          } catch (err) {
            errors.push(`${tag} ${notifType}: ${err}`);
          }
        }
      }

      // Results notifications
      const resWindow = RESULTS_WINDOW[session.type];
      if (!resWindow) continue;

      const elapsed = now - sessionTime;
      if (elapsed < resWindow.minMs || elapsed > resWindow.maxMs) continue;

      try {
        if (await isNotifSent(row.seriesSlug, row.season, race.round, session.type, "results")) continue;

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
              resultsReady = race.status === "completed";
            } else {
              const m = race.name.match(/(\d+)\s*hour/i);
              const liveWindowMs = m
                ? (parseInt(m[1], 10) + 2) * 60 * 60 * 1000
                : /endurance/i.test(race.name) ? 5 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
              resultsReady = elapsed > liveWindowMs;
            }
          } else {
            resultsReady = true;
          }
        }

        if (!resultsReady) continue;

        await sendPushToSubscribers(row.seriesSlug, {
          title: `${icon} ${label} Sonuçları Açıklandı`,
          body: `${race.name} — ${race.circuitName}`,
          url: `/${row.seriesSlug}/races/${race.round}`,
        });
        await markNotifSent(row.seriesSlug, row.season, race.round, session.type, "results");
        sent.push(`${tag} results`);
      } catch (err) {
        errors.push(`${tag} results: ${err}`);
      }
    }
  }

  return { sent, errors };
}
