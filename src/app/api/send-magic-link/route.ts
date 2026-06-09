import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac, randomUUID } from "crypto";
import { Resend } from "resend";
import { sendNewUserDiscordNotification } from "@/lib/discord";

const BodySchema = z.object({ email: z.string().email() });

function hashToken(raw: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(raw).digest("hex");
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { email } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, status: true, name: true, image: true },
  });

  if (existing?.status === "blocked") {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  if (!existing) {
    const [created] = await db.insert(users).values({ email, status: "pending" }).returning();
    await sendNewUserDiscordNotification({
      userId: created.id,
      name: null,
      email,
      provider: "resend",
      image: null,
      signupAt: new Date(),
    }).catch((err) => console.error("Discord notification failed:", err));
  } else if (existing.status === "pending") {
    await sendNewUserDiscordNotification({
      userId: existing.id,
      name: existing.name ?? null,
      email,
      provider: "resend",
      image: existing.image ?? null,
      signupAt: new Date(),
    }).catch((err) => console.error("Discord notification failed:", err));
  }

  // Auth.js formatında token üret ve kaydet
  const rawToken = randomUUID();
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(rawToken),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const magicLink = `${appUrl}/api/auth/callback/resend?callbackUrl=%2F&token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const { error } = await resend.emails.send({
    from: "MSHub <noreply@mshub.aykq.org.tr>",
    to: email,
    subject: "MSHub — Giriş Bağlantısı",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
        <div style="margin-bottom:24px;">
          <span style="font-size:28px;font-weight:900;color:#e11d48;">MS</span>
          <span style="font-size:28px;font-weight:900;color:#111827;">Hub</span>
        </div>
        <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">
          Aşağıdaki butona tıklayarak MSHub'a giriş yapabilirsiniz.<br>
          Bu bağlantı 24 saat geçerlidir.
        </p>
        <a href="${magicLink}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          MSHub'a Giriş Yap →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#9ca3af;">
          Bu e-postayı beklemiyorsanız görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Magic link email failed:", error);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
