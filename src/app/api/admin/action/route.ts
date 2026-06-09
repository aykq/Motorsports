import { auth } from "@/lib/auth";
import { verifyApprovalToken } from "@/lib/admin-token";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendApprovalEmail } from "@/lib/email";

const BodySchema = z.object({
  token: z.string(),
  action: z.enum(["approve", "reject", "block"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const [updated] = await db
      .update(users)
      .set({ status: "approved" })
      .where(eq(users.id, payload.userId))
      .returning({ email: users.email, name: users.name });

    if (updated?.email) {
      try {
        await sendApprovalEmail(updated.email, updated.name);
      } catch (err) {
        console.error("Approval email failed:", err);
      }
    }
  } else if (action === "reject") {
    await db.delete(users).where(eq(users.id, payload.userId));
  } else {
    await db.update(users).set({ status: "blocked" }).where(eq(users.id, payload.userId));
  }

  return NextResponse.json({ ok: true });
}
