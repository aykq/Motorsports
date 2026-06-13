import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cachedRaces } from "@/db/schema";
import { AdminPanel } from "./AdminPanel";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Panel" };

async function getLastSyncTimes(): Promise<Record<string, string | null>> {
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

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  const lastSyncTimes = await getLastSyncTimes();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>
      <AdminPanel lastSyncTimes={lastSyncTimes} />
    </div>
  );
}
