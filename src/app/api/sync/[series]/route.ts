import { NextRequest, NextResponse } from "next/server";
import { syncSeries } from "@/lib/sync";
import { verifyCronSecret } from "@/lib/cron-auth";

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
    console.error("[sync] failed:", series, err);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
