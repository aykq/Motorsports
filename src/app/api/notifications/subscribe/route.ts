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
  return NextResponse.json({ seriesEnabled: sub.seriesEnabled });
}

const knownSlug = z.string().refine((s) => !!getAdapter(s), { message: "Unknown series" });

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  seriesEnabled: z.array(knownSlug).default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { endpoint, keys, seriesEnabled } = parsed.data;

  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, endpoint),
  });
  if (existing && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: session.user.id, endpoint, keys, seriesEnabled })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { keys, seriesEnabled },
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
  seriesEnabled: z.array(knownSlug),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await db
    .update(pushSubscriptions)
    .set({ seriesEnabled: parsed.data.seriesEnabled })
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, parsed.data.endpoint)
      )
    );

  return NextResponse.json({ ok: true });
}
