import { NextRequest, NextResponse } from "next/server";
import { syncSeries } from "@/lib/sync";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logError } from "@/lib/error-log";
import { getShowNonF1Series } from "@/lib/app-settings";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ series: string }> }
) {
  if (!verifyCronSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { series } = await params;

  // Non-F1 seriler UI'da gizliyken host crontab'ının döngüsü (her seri için ayrı
  // curl) yine de bu route'u tetikliyor — burada erken çıkmak, admin panelindeki
  // manuel "şimdi senkronize et" (syncSeriesAction, syncSeries'i doğrudan çağırıyor,
  // bu route'u değil) etkilenmeden otomatik scraping'i durdurur.
  if (series !== "f1" && !(await getShowNonF1Series())) {
    return NextResponse.json({ ok: true, skipped: "non-f1 series hidden" });
  }

  const season = new Date().getFullYear();

  try {
    const result = await syncSeries(series, season);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    await logError({ source: "api/sync", severity: "error", message: `${series}: ${err instanceof Error ? err.message : String(err)}` });
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
