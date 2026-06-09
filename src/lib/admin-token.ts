import { createHmac } from "crypto";

const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000;

export function createApprovalToken(userId: string): string {
  const secret = process.env.ADMIN_SECRET!;
  const payload = JSON.stringify({ userId, exp: Date.now() + EXPIRES_IN });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyApprovalToken(token: string): { userId: string } | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expected = createHmac("sha256", secret).update(encoded).digest("hex");
  if (expected !== sig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as {
      userId: unknown;
      exp: unknown;
    };
    if (typeof payload.userId !== "string") return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
