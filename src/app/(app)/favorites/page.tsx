import { auth } from "@/lib/auth";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getShowNonF1Series } from "@/lib/app-settings";
import { FavoritesClient } from "./FavoritesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favoriler" };

export default async function FavoritesPage() {
  const session = await auth();
  const [initialFavorites, showNonF1Series] = await Promise.all([
    session?.user?.id
      ? db.query.favorites
          .findMany({ where: eq(favorites.userId, session.user.id) })
          .then((rows) => rows.map((r) => r.seriesSlug))
      : Promise.resolve<string[]>([]),
    getShowNonF1Series(),
  ]);

  return <FavoritesClient initialFavorites={initialFavorites} showNonF1Series={showNonF1Series} />;
}
