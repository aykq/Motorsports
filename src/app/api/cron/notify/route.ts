import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { notifySessions } from "@/lib/notify-sessions";

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await notifySessions();
    if (result.sent.length) console.log("[cron/notify] sent:", result.sent);
    if (result.errors.length) console.error("[cron/notify] errors:", result.errors);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/notify] fatal:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
