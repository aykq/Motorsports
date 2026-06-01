import { NextResponse } from "next/server";
import { sendPushToSubscribers } from "@/lib/push";
import { z } from "zod";
import { verifyCronSecret } from "@/lib/cron-auth";

const bodySchema = z.object({
  seriesSlug: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().regex(/^\/[^/]/).optional(),
});

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { seriesSlug, title, body, url } = parsed.data;
  const result = await sendPushToSubscribers(seriesSlug, { title, body, url });

  return NextResponse.json(result);
}
