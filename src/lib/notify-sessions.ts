import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sentNotifications } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import { jolpicaFetchQualifyingResults, jolpicaFetchSprintResults } from "@/lib/adapters/f1/jolpica";
import { getSeriesConfig } from "@/lib/series-config";
import type { Race } from "@/types/series";

const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

const RESULTS_WINDOW: Record<string, number> = {
  qualifying:   4 * 60 * 60 * 1000,
  sprintQuali:  2 * 60 * 60 * 1000,
  sprint:       2 * 60 * 60 * 1000,
  race:        32 * 60 * 60 * 1000,
};

// For non-F1 series we can't query live results, so a non-race session's
// results are only considered ready once it has plausibly finished — i.e. after
// this much elapsed since its start. Without this, "results announced" fired the
// instant the session started (together with the "started" notification).
const NON_RACE_RESULTS_DELAY_MS: Record<string, number> = {
  qualifying:  60 * 60 * 1000,
  sprintQuali: 45 * 60 * 1000,
  sprint:      75 * 60 * 1000,
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
    start:   { start: now -  4 * 60 * 1000, end: now +  6 * 60 * 1000 },
  };

  const allRaces = await db.query.cachedRaces.findMany();

  for (const row of allRaces) {
    const race = row.data as Race;

    for (const session of (race.sessions ?? [])) {
      const sessionTime = new Date(session.date).getTime();
      const label = SESSION_LABELS[session.type] ?? session.type;
      const icon  = SESSION_ICONS[session.type] ?? "🏎️";
      const tag   = `[${row.seriesSlug} R${race.round} ${session.type}]`;
      const seriesName = getSeriesConfig(row.seriesSlug)?.shortName ?? row.seriesSlug.toUpperCase();

      // Pre-session notifications — kullanıcı tercihleri push fonksiyonunda filtrelenir
      for (const [notifType, window] of Object.entries(preWindows)) {
        if (sessionTime < window.start || sessionTime > window.end) continue;

        try {
          if (await isNotifSent(row.seriesSlug, row.season, race.round, session.type, notifType)) continue;

          const title =
            notifType === "pre_1h"  ? `${icon} ${label} 1 saat sonra başlıyor` :
            notifType === "pre_15m" ? `${icon} ${label} 15 dakika sonra başlıyor` :
                                      `${icon} ${label} başladı!`;

          await sendPushToSubscribers(row.seriesSlug, session.type, {
            title,
            body: `${seriesName} · ${race.name} — ${race.circuitName}`,
            url: `/${row.seriesSlug}`,
          });
          await markNotifSent(row.seriesSlug, row.season, race.round, session.type, notifType);
          sent.push(`${tag} ${notifType}`);
        } catch (err) {
          errors.push(`${tag} ${notifType}: ${err}`);
        }
      }

      // Results notifications
      const maxMs = RESULTS_WINDOW[session.type];
      if (maxMs === undefined) continue;

      const elapsed = now - sessionTime;
      if (elapsed < 0 || elapsed > maxMs) continue;

      try {
        if (await isNotifSent(row.seriesSlug, row.season, race.round, session.type, "results")) continue;

        let resultsReady = false;

        if (row.seriesSlug === "f1") {
          if (session.type === "race") {
            resultsReady = (race.results?.length ?? 0) >= 18;
          } else if (session.type === "qualifying") {
            const results = await jolpicaFetchQualifyingResults(row.season, race.round);
            resultsReady = results.filter((r) => r.q3).length >= 9;
          } else if (session.type === "sprintQuali") {
            const results = await jolpicaFetchQualifyingResults(row.season, race.round);
            resultsReady = results.filter((r) => r.q1).length >= 15;
          } else if (session.type === "sprint") {
            const results = await jolpicaFetchSprintResults(row.season, race.round);
            resultsReady = results.length >= 18;
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
            // Non-race sessions (sprint, qualifying, sprintQuali): ready only once
            // the session has plausibly finished — never at its start.
            const delay = NON_RACE_RESULTS_DELAY_MS[session.type] ?? 60 * 60 * 1000;
            resultsReady = elapsed > delay;
          }
        }

        if (!resultsReady) continue;

        await sendPushToSubscribers(row.seriesSlug, session.type, {
          title: `${icon} ${label} Sonuçları Açıklandı`,
          body: `${seriesName} · ${race.name} — ${race.circuitName}`,
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
