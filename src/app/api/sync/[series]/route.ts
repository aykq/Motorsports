import { NextRequest, NextResponse } from "next/server";
import { syncSeries } from "@/lib/sync";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logError } from "@/lib/error-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ series: string }> }
) {
  if (!verifyCronSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { series } = await params;
  const season = new Date().getFullYear();

  try {
    const result = await syncSeries(series, season);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    await logError({ source: "api/sync", severity: "error", message: `${series}: ${err instanceof Error ? err.message : String(err)}` });
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
