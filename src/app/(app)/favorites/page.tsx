import { auth } from "@/lib/auth";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { FavoritesClient } from "./FavoritesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favoriler" };

export default async function FavoritesPage() {
  const session = await auth();
  const initialFavorites: string[] = session?.user?.id
    ? (
        await db.query.favorites.findMany({
          where: eq(favorites.userId, session.user.id),
        })
      ).map((r) => r.seriesSlug)
    : [];

  return <FavoritesClient initialFavorites={initialFavorites} />;
}
