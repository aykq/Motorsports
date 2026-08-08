import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { syncCircuitData } from "@/lib/sync";
import { logError } from "@/lib/error-log";
import { db } from "@/db";
import { errorLog } from "@/db/schema";
import { lt } from "drizzle-orm";

// f1.com'un pist sayfalarını (23 sayfa, ~500ms aralıklarla) scrape edip
// cached_circuit'i tazeler. Düşük sıklıkta çalışması amaçlanıyor (günde/haftada
// bir) — bkz. docs/cron-setup.md. Diğer serilerde bu veri kaynağı yok, sadece F1.
// Aynı zamanda 30 günden eski error_log kayıtlarını temizler (günlük çalıştığı için
// ayrı bir retention cron'una gerek yok).
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let response: NextResponse;
  try {
    const season = new Date().getFullYear();
    const result = await syncCircuitData(season);
    if (result.errors.length) {
      await logError({ source: "cron/circuit-data", severity: "warning", message: result.errors.join("; ") });
    }

    response = NextResponse.json({ ok: true, ...result });
  } catch (err) {
    await logError({
      source: "cron/circuit-data",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    response = NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    // Scrape başarısız olsa da retention temizliği atlanmasın diye finally'de —
    // bkz. docs/cron-setup.md.
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await db.delete(errorLog).where(lt(errorLog.createdAt, cutoff));
    } catch (err) {
      await logError({
        source: "cron/circuit-data-cleanup",
        severity: "warning",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return response;
}
