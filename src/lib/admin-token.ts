import { createHmac } from "crypto";

const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000;
const AUTO_LOGIN_EXPIRES_IN = 10 * 60 * 1000;

function makeToken(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

function parseToken(token: string, secret: string): Record<string, unknown> | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expected = createHmac("sha256", secret).update(encoded).digest("hex");
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createApprovalToken(userId: string): string {
  const secret = process.env.ADMIN_SECRET!;
  return makeToken({ userId, exp: Date.now() + EXPIRES_IN }, secret);
}

export function verifyApprovalToken(token: string): { userId: string } | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  const payload = parseToken(token, secret);
  if (!payload) return null;
  if (typeof payload.userId !== "string") return null;
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  return { userId: payload.userId };
}

export function createAutoLoginToken(userId: string): string {
  const secret = process.env.ADMIN_SECRET!;
  return makeToken({ userId, exp: Date.now() + AUTO_LOGIN_EXPIRES_IN, type: "auto-login" }, secret);
}

export function verifyAutoLoginToken(token: string): { userId: string } | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  const payload = parseToken(token, secret);
  if (!payload) return null;
  if (typeof payload.userId !== "string") return null;
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  if (payload.type !== "auto-login") return null;
  return { userId: payload.userId };
}
