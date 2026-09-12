import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sentNotifications } from "@/db/schema";
import { sendPushToSubscribers } from "@/lib/push";
import { isMScomF1RaceFinished } from "@/lib/adapters/f1/motorsport-com-scraper";
import { getSeriesConfig } from "@/lib/series-config";
import { recomputeRaceStatus, getRaceDetailRaw } from "@/lib/cache";
import { getShowNonF1Series } from "@/lib/app-settings";
import type { Race, RaceDetail } from "@/types/series";

const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

// syncActiveSessionData() (race-detail.ts, runs every 2 min) already computes these
// flags with tuned thresholds (Q3 driver count, sprint classification size, etc.) and
// writes them into the same cached RaceDetail the results pages read. Re-deriving
// readiness here from raw OpenF1/Jolpica calls would just duplicate that logic with a
// second, divergent definition of "complete" — reading the flag keeps one source of truth.
const F1_RESULTS_COMPLETE_FLAG: Partial<Record<string, keyof RaceDetail>> = {
  practice1: "practice1Complete",
  practice2: "practice2Complete",
  practice3: "practice3Complete",
  qualifying: "qualifyingComplete",
  sprintQuali: "sprintQualiComplete",
  sprint: "sprintComplete",
};

/** Exported for testing. */
export async function isF1SessionResultsReady(
  seriesSlug: string,
  season: number,
  round: number,
  sessionType: string,
  raceName: string
): Promise<boolean> {
  if (sessionType === "race") return isMScomF1RaceFinished(season, raceName);
  const flagKey = F1_RESULTS_COMPLETE_FLAG[sessionType];
  if (!flagKey) return false;
  const detail = await getRaceDetailRaw(seriesSlug, season, round);
  return Boolean(detail?.[flagKey]);
}

const RESULTS_WINDOW: Record<string, number> = {
  practice1:    3 * 60 * 60 * 1000,
  practice2:    3 * 60 * 60 * 1000,
  practice3:    3 * 60 * 60 * 1000,
  qualifying:  12 * 60 * 60 * 1000,
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

// Atomically claims this notification via the table's unique constraint —
// returns true only if THIS call actually inserted the row. Call this BEFORE
// sending the push (not after) so two overlapping cron runs can't both pass
// the earlier isNotifSent() read and both send a duplicate push.
async function markNotifSent(
  seriesSlug: string, season: number, round: number,
  sessionType: string, notifType: string
): Promise<boolean> {
  const inserted = await db
    .insert(sentNotifications)
    .values({ seriesSlug, season, round, sessionType, notifType })
    .onConflictDoNothing()
    .returning({ id: sentNotifications.id });
  return inserted.length > 0;
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

  const [allRaces, showNonF1Series] = await Promise.all([
    db.query.cachedRaces.findMany(),
    getShowNonF1Series(),
  ]);

  for (const row of allRaces) {
    if (!showNonF1Series && row.seriesSlug !== "f1") continue;

    const race = recomputeRaceStatus(row.data as Race, row.seriesSlug);

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

          const claimed = await markNotifSent(row.seriesSlug, row.season, race.round, session.type, notifType);
          if (!claimed) continue; // another concurrent run already sent this

          await sendPushToSubscribers(row.seriesSlug, session.type, {
            title,
            body: `${seriesName} · ${race.name} — ${race.circuitName}`,
            url: `/${row.seriesSlug}`,
          });
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
          resultsReady = await isF1SessionResultsReady(
            row.seriesSlug, row.season, race.round, session.type, race.name
          );
        } else {
          if (session.type === "race") {
            if (STATUS_DRIVEN_SERIES.has(row.seriesSlug)) {
              resultsReady = race.status === "completed";
            } else {
              const m = race.name.match(/(\d+)\s*hour/i);
              const liveWindowMs = m
                ? (parseInt(m[1], 10) + 2) * 60 * 60 * 1000
                : /endurance/i.test(race.name) || /le mans/i.test(race.name) ? 5 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
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

        const claimed = await markNotifSent(row.seriesSlug, row.season, race.round, session.type, "results");
        if (!claimed) continue; // another concurrent run already sent this

        await sendPushToSubscribers(row.seriesSlug, session.type, {
          title: `${icon} ${label} Sonuçları Açıklandı`,
          body: `${seriesName} · ${race.name} — ${race.circuitName}`,
          url: `/${row.seriesSlug}/races/${race.round}`,
        });
        sent.push(`${tag} results`);
      } catch (err) {
        errors.push(`${tag} results: ${err}`);
      }
    }
  }

  return { sent, errors };
}
