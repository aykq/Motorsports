import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions, notificationLog } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { DEFAULT_SESSION_TYPES } from "@/lib/session-types";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToSubscribers(
  seriesSlug: string,
  sessionType: string | null,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await db.query.pushSubscriptions.findMany();

  const targets = subs.filter((s) => {
    if (!s.seriesEnabled.includes(seriesSlug)) return false;
    if (sessionType === null) return true; // bypass filter for manual sends
    const prefs = (s.sessionPreferences as Record<string, string[]> | null) ?? {};
    const allowed = prefs[seriesSlug] ?? DEFAULT_SESSION_TYPES;
    return allowed.includes(sessionType);
  });

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  await Promise.allSettled(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          expiredIds.push(sub.id);
        }
        failed++;
      }
    })
  );

  if (expiredIds.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, expiredIds));
  }

  // Her gönderimi logla (manuel = sessionType null, otomatik = cron seans tipi).
  // Loglama hatası asıl gönderimi etkilemesin.
  try {
    await db.insert(notificationLog).values({
      seriesSlug,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      source: sessionType === null ? "manual" : "auto",
      sentCount: sent,
      failedCount: failed,
    });
  } catch (err) {
    console.error("[push] notification_log insert failed:", err);
  }

  return { sent, failed };
}
