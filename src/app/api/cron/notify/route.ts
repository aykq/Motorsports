import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { notifySessions } from "@/lib/notify-sessions";
import { logError } from "@/lib/error-log";

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await notifySessions();
    if (result.sent.length) console.log("[cron/notify] sent:", result.sent);
    if (result.errors.length) {
      await logError({ source: "cron/notify", severity: "warning", message: result.errors.join("; ") });
    }
    return NextResponse.json(result);
  } catch (err) {
    await logError({
      source: "cron/notify",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
