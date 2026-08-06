import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

const SINGLETON_ID = "singleton";

// No unstable_cache here on purpose: a single indexed PK read is sub-millisecond
// (measured ~0.55ms avg locally), and this toggle must be instant when an admin
// flips it — tag-based revalidation had an observed one-navigation propagation
// lag in testing, which isn't worth trading for a cache on a query this cheap.
export async function getShowNonF1Series(): Promise<boolean> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.id, SINGLETON_ID),
  });
  return row?.showNonF1Series ?? false;
}

export async function setShowNonF1Series(value: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ id: SINGLETON_ID, showNonF1Series: value })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { showNonF1Series: value },
    });
}
