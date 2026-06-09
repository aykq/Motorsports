import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UsersTable } from "./UsersTable";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.email !== process.env.ADMIN_EMAIL) redirect("/");

  const [userRows, accountRows] = await Promise.all([
    db.select().from(users).orderBy(users.createdAt),
    db.select({ userId: accounts.userId, provider: accounts.provider }).from(accounts),
  ]);

  const providerMap = new Map(accountRows.map((a) => [a.userId, a.provider]));
  const initialUsers = userRows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    provider: providerMap.get(u.id) ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-500">MS</span>
            <span className="text-2xl font-black text-foreground">Hub</span>
            <span className="text-lg font-semibold text-muted-foreground ml-2">Yönetim</span>
          </div>
          <p className="text-sm text-muted-foreground">Kayıtlı kullanıcılar — her 5 saniyede güncellenir</p>
        </div>
        <UsersTable initialUsers={initialUsers} />
      </div>
    </div>
  );
}
