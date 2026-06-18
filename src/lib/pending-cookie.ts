import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "mshub-pending";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(userId: string): string {
  const sig = createHmac("sha256", process.env.AUTH_SECRET!)
    .update(userId)
    .digest("base64url");
  return `${Buffer.from(userId).toString("base64url")}.${sig}`;
}

function verify(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const encodedId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let userId: string;
  try {
    userId = Buffer.from(encodedId, "base64url").toString("utf-8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", process.env.AUTH_SECRET!)
    .update(userId)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return userId;
}

export function setPendingCookie(res: NextResponse, userId: string): void {
  res.cookies.set(COOKIE_NAME, sign(userId), {
    httpOnly: false, // JS can clear it on block/logout
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function clearPendingCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function getPendingUserId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verify(value);
}
