import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/adapters";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const sub = await db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.userId, session.user.id),
      eq(pushSubscriptions.endpoint, endpoint)
    ),
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    seriesEnabled: sub.seriesEnabled,
    sessionPreferences: sub.sessionPreferences ?? {},
  });
}

const knownSlug = z.string().refine((s) => !!getAdapter(s), { message: "Unknown series" });
const sessionPreferencesSchema = z.record(z.string(), z.array(z.string())).optional();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  seriesEnabled: z.array(knownSlug).default([]),
  sessionPreferences: sessionPreferencesSchema,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { endpoint, keys, seriesEnabled, sessionPreferences } = parsed.data;

  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, endpoint),
  });
  if (existing && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      keys,
      seriesEnabled,
      sessionPreferences: sessionPreferences ?? {},
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { keys, seriesEnabled, sessionPreferences: sessionPreferences ?? {} },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

  return NextResponse.json({ ok: true });
}

const updateSchema = z.object({
  endpoint: z.string().url(),
  seriesEnabled: z.array(knownSlug).optional(),
  sessionPreferences: sessionPreferencesSchema,
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { endpoint, seriesEnabled, sessionPreferences } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (seriesEnabled !== undefined) updateData.seriesEnabled = seriesEnabled;
  if (sessionPreferences !== undefined) updateData.sessionPreferences = sessionPreferences;

  await db
    .update(pushSubscriptions)
    .set(updateData)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

  return NextResponse.json({ ok: true });
}
