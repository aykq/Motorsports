import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNewUserDiscordNotification } from "@/lib/discord";

const BodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { email } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, status: true, name: true, image: true },
  });

  if (existing) {
    if (existing.status === "pending") {
      await sendNewUserDiscordNotification({
        userId: existing.id,
        name: existing.name ?? null,
        email,
        provider: "resend",
        image: existing.image ?? null,
        signupAt: new Date(),
      }).catch((err) => console.error("Discord notification failed:", err));
    }
    return NextResponse.json({ ok: true });
  }

  // Yeni kullanıcı — pending olarak önceden oluştur
  const [created] = await db
    .insert(users)
    .values({ email, status: "pending" })
    .returning();

  await sendNewUserDiscordNotification({
    userId: created.id,
    name: null,
    email,
    provider: "resend",
    image: null,
    signupAt: new Date(),
  }).catch((err) => console.error("Discord notification failed:", err));

  return NextResponse.json({ ok: true });
}
