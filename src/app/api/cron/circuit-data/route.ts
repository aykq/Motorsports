import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { syncCircuitData } from "@/lib/sync";

// f1.com'un pist sayfalarını (23 sayfa, ~500ms aralıklarla) scrape edip
// cached_circuit'i tazeler. Düşük sıklıkta çalışması amaçlanıyor (günde/haftada
// bir) — bkz. docs/cron-setup.md. Diğer serilerde bu veri kaynağı yok, sadece F1.
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const season = new Date().getFullYear();
    const result = await syncCircuitData(season);
    if (result.errors.length) console.error("[cron/circuit-data] errors:", result.errors);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/circuit-data] fatal:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
