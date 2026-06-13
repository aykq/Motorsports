import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cachedRaces, users, accounts } from "@/db/schema";
import { AdminPanel } from "./AdminPanel";
import { UsersTable } from "./UsersTable";
import { ShieldAlert, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim" };

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

async function getInitialUsers() {
  const [userRows, accountRows] = await Promise.all([
    db.select().from(users).orderBy(users.createdAt),
    db.select({ userId: accounts.userId, provider: accounts.provider }).from(accounts),
  ]);
  const providerMap = new Map(accountRows.map((a) => [a.userId, a.provider]));
  return userRows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    provider: providerMap.get(u.id) ?? null,
  }));
}

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  const [lastSyncTimes, initialUsers] = await Promise.all([
    getLastSyncTimes(),
    getInitialUsers(),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Yönetim</h1>
      </div>

      <AdminPanel lastSyncTimes={lastSyncTimes} />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Kullanıcılar</h2>
        </div>
        <UsersTable initialUsers={initialUsers} />
      </section>
    </div>
  );
}
