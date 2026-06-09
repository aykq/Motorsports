import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAutoLoginToken } from "@/lib/admin-token";

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ status: "unknown" });

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, status: true },
  });

  if (!user) return NextResponse.json({ status: "unknown" });
  if (user.status !== "approved") return NextResponse.json({ status: user.status });

  const autoLoginToken = createAutoLoginToken(user.id);
  return NextResponse.json({ status: "approved", autoLoginToken });
}
