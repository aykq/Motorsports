"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cachedRaceDetails, cachedRaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncSeries } from "@/lib/sync";
import { sendPushToSubscribers } from "@/lib/push";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
}

export async function syncSeriesAction(slug: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const year = new Date().getFullYear();
  try {
    const result = await syncSeries(slug, year);
    const msg = `${result.racesCount} races, ${result.driversCount} drivers, ${result.raceDetailsSynced} details`;
    return { ok: true, message: msg };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function clearRaceDetailAction(
  slug: string,
  round: number
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const year = new Date().getFullYear();
  try {
    await db
      .delete(cachedRaceDetails)
      .where(
        and(
          eq(cachedRaceDetails.seriesSlug, slug),
          eq(cachedRaceDetails.season, year),
          eq(cachedRaceDetails.round, round)
        )
      );
    return { ok: true, message: `Race detail cleared for ${slug} R${round}` };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function sendTestNotifAction(
  slug: string,
  title: string,
  body: string
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    await sendPushToSubscribers(slug, { title, body, url: `/${slug}` });
    return { ok: true, message: `Notification sent to ${slug} subscribers` };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

export async function getLastSyncTimesAction(): Promise<Record<string, string | null>> {
  await requireAdmin();
  const rows = await db.query.cachedRaces.findMany();
  const bySlug: Record<string, Date | null> = {};
  for (const row of rows) {
    const prev = bySlug[row.seriesSlug];
    if (!prev || row.fetchedAt > prev) {
      bySlug[row.seriesSlug] = row.fetchedAt;
    }
  }
  return Object.fromEntries(
    Object.entries(bySlug).map(([slug, d]) => [slug, d ? d.toISOString() : null])
  );
}
