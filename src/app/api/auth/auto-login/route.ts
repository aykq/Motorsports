import { NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAutoLoginToken } from "@/lib/admin-token";

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const loginUrl = new URL("/login", appUrl);
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(loginUrl);

  const payload = verifyAutoLoginToken(token);
  if (!payload) return NextResponse.redirect(loginUrl);

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
    columns: { id: true, name: true, email: true, image: true, status: true },
  });

  if (!user || user.status !== "approved") return NextResponse.redirect(loginUrl);

  const secret = process.env.AUTH_SECRET!;
  const isSecure = (process.env.AUTH_URL ?? "").startsWith("https://");
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const sessionJwt = await encode({
    token: {
      sub: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      picture: user.image ?? undefined,
    },
    secret,
    salt: cookieName,
    maxAge: 30 * 24 * 60 * 60,
  });

  const response = NextResponse.redirect(new URL("/", appUrl));
  response.cookies.set(cookieName, sessionJwt, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
