import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { cachedRaces, users, accounts, sessions, pushSubscriptions, favorites, notificationLog } from "@/db/schema";
import { max, count, countDistinct, gt, sql } from "drizzle-orm";
import { AdminPanel } from "./AdminPanel";
import { getRecentNotificationsAction } from "./actions";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim" };

async function getLastSyncTimes(): Promise<Record<string, string | null>> {
  const rows = await db
    .select({ seriesSlug: cachedRaces.seriesSlug, lastSync: max(cachedRaces.fetchedAt) })
    .from(cachedRaces)
    .groupBy(cachedRaces.seriesSlug);
  return Object.fromEntries(
    rows.map((r) => [r.seriesSlug, r.lastSync ? r.lastSync.toISOString() : null])
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

async function getAdminStats() {
  const [userRows, subRows, sessionRows, notifRows] = await Promise.all([
    db.select({
      total: count(),
      pending: sql<number>`cast(count(*) filter (where status = 'pending') as int)`,
    }).from(users),
    db.select({
      seriesEnabled: pushSubscriptions.seriesEnabled,
    }).from(pushSubscriptions),
    db.select({ total: countDistinct(sessions.userId) })
      .from(sessions)
      .where(gt(sessions.expires, new Date())),
    db.select({
      total: count(),
      devices: sql<number>`cast(coalesce(sum(${notificationLog.sentCount}), 0) as int)`,
    }).from(notificationLog),
  ]);

  const userStats = userRows[0] ?? { total: 0, pending: 0 };
  const notifStats = notifRows[0] ?? { total: 0, devices: 0 };

  const subscriptionsBySeries: Record<string, number> = {};
  for (const sub of subRows) {
    for (const slug of sub.seriesEnabled) {
      subscriptionsBySeries[slug] = (subscriptionsBySeries[slug] ?? 0) + 1;
    }
  }

  return {
    totalUsers: userStats.total,
    pendingUsers: Number(userStats.pending),
    activeSubscriptions: subRows.length,
    activeSessions: sessionRows[0]?.total ?? 0,
    subscriptionsBySeries,
    notificationsSent: Number(notifStats.total),
    devicesReached: Number(notifStats.devices),
  };
}

export default async function AdminPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/");

  const [lastSyncTimes, initialUsers, stats, initialNotifications] = await Promise.all([
    getLastSyncTimes(),
    getInitialUsers(),
    getAdminStats(),
    getRecentNotificationsAction({ limit: 10 }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Yönetim</h1>
      </div>
      <AdminPanel
        stats={stats}
        lastSyncTimes={lastSyncTimes}
        initialUsers={initialUsers}
        initialNotifications={initialNotifications}
      />
    </div>
  );
}
