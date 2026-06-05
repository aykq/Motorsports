import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_LOCALES = ["tr", "en"] as const;
const VALID_THEMES = ["light", "dark", "system"] as const;

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const updates: { language?: string; theme?: string } = {};

  if (body.language && (VALID_LOCALES as readonly string[]).includes(body.language)) {
    updates.language = body.language;
  }
  if (body.theme && (VALID_THEMES as readonly string[]).includes(body.theme)) {
    updates.theme = body.theme;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: false, error: "No valid fields" }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id));
  return Response.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { language: true, theme: true },
  });

  return Response.json({ language: user?.language ?? null, theme: user?.theme ?? null });
}
