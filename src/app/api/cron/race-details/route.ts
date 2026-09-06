import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getCachedSchedule } from "@/lib/cache";
import { syncRaceDetails } from "@/lib/race-detail";
import { logError } from "@/lib/error-log";

// F1 race detail backfill — race control translation + missing practice/stint/
// sprint data for the current season. Runs on crontab after the 6h full sync.
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const season = new Date().getFullYear();
    const { races } = await getCachedSchedule("f1", season);
    const recent = races.filter((r) => r.status === "completed" || r.status === "live");

    if (!recent.length) return NextResponse.json({ ok: true, synced: 0 });

    const result = await syncRaceDetails("f1", season, recent);
    if (result.errors.length) {
      await logError({ source: "cron/race-details", severity: "warning", message: result.errors.join("; ") });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    await logError({
      source: "cron/race-details",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
