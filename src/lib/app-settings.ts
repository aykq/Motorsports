import { unstable_cache, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

const SINGLETON_ID = "singleton";

const _getShowNonF1Series = unstable_cache(
  async (): Promise<boolean> => {
    const row = await db.query.appSettings.findFirst({
      where: eq(appSettings.id, SINGLETON_ID),
    });
    return row?.showNonF1Series ?? false;
  },
  ["app-settings-show-non-f1"],
  { tags: ["app-settings"] }
);

export async function getShowNonF1Series(): Promise<boolean> {
  return _getShowNonF1Series();
}

export async function setShowNonF1Series(value: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ id: SINGLETON_ID, showNonF1Series: value })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { showNonF1Series: value },
    });
  revalidateTag("app-settings", "max");
}
