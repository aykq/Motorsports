import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userRows, accountRows] = await Promise.all([
    db.select().from(users).orderBy(users.createdAt),
    db.select({ userId: accounts.userId, provider: accounts.provider }).from(accounts),
  ]);

  const providerMap = new Map(accountRows.map((a) => [a.userId, a.provider]));

  return NextResponse.json(
    userRows.map((u) => ({ ...u, provider: providerMap.get(u.id) ?? null }))
  );
}

const ActionSchema = z.object({
  userId: z.string(),
  action: z.enum(["delete", "approve", "block", "pending"]),
});

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userId, action } = parsed.data;

  if (action === "delete") {
    await db.delete(users).where(eq(users.id, userId));
  } else {
    const statusMap = { approve: "approved", block: "blocked", pending: "pending" } as const;
    await db.update(users).set({ status: statusMap[action] }).where(eq(users.id, userId));
  }

  return NextResponse.json({ ok: true });
}
