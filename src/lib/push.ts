import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { arrayContains, eq } from "drizzle-orm";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToSubscribers(
  seriesSlug: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await db.query.pushSubscriptions.findMany({
    where: arrayContains(pushSubscriptions.seriesEnabled, [seriesSlug]),
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      const keys = sub.keys as { p256dh: string; auth: string };
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    })
  );

  return { sent, failed };
}
