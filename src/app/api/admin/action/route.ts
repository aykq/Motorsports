import { signIn } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { verifyApprovalToken } from "@/lib/admin-token";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendUnblockedEmail } from "@/lib/email";
import { broadcastUserStatus } from "@/lib/sse";

const BodySchema = z.object({
  token: z.string(),
  action: z.enum(["approve", "reject", "block"]),
});

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, action } = parsed.data;

  const payload = verifyApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (action === "approve") {
    const current = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      columns: { email: true, status: true },
    });

    await db
      .update(users)
      .set({ status: "approved" })
      .where(eq(users.id, payload.userId));

    broadcastUserStatus(payload.userId, { status: "approved" });

    if (current?.email) {
      try {
        if (current.status === "blocked") {
          await sendUnblockedEmail(current.email);
        } else {
          await signIn("nodemailer", { email: current.email, redirect: false, callbackUrl: "/" });
        }
      } catch (err) {
        console.error("Approval email failed:", err);
      }
    }
  } else if (action === "reject") {
    await db.delete(users).where(eq(users.id, payload.userId));
  } else {
    await db
      .update(users)
      .set({ status: "blocked" })
      .where(eq(users.id, payload.userId));

    broadcastUserStatus(payload.userId, { status: "blocked" });
  }

  return NextResponse.json({ ok: true });
}
