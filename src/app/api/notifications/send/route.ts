import { NextResponse } from "next/server";
import { sendPushToSubscribers } from "@/lib/push";
import { z } from "zod";

const bodySchema = z.object({
  seriesSlug: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
});

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { seriesSlug, title, body, url } = parsed.data;
  const result = await sendPushToSubscribers(seriesSlug, { title, body, url });

  return NextResponse.json(result);
}
