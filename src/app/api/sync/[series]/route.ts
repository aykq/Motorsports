import { NextRequest, NextResponse } from "next/server";
import { syncSeries } from "@/lib/sync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ series: string }> }
) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { series } = await params;
  const season = new Date().getFullYear();

  try {
    const result = await syncSeries(series, season);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
