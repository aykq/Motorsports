import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/db";
import { isActiveRaceWeekend } from "@/lib/race-detail";
import { syncScheduleOnly } from "@/lib/sync";
import type { Race } from "@/types/series";
import { logError } from "@/lib/error-log";
import { getShowNonF1Series } from "@/lib/app-settings";

// MotoGP/WEC gibi status-güdümlü serilerde yarış durumunu ("FINISHED"/"FT" →
// "completed") tazeler; bildirim cron'u tamamlanmayı bu sayede yakalar.
const STATUS_DRIVEN_SERIES = new Set(["motogp", "moto2", "moto3", "wec"]);

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // STATUS_DRIVEN_SERIES tamamı non-F1 — UI'da gizliyken bu route'un hiç işi yok.
  if (!(await getShowNonF1Series())) {
    return NextResponse.json({ ok: true, refreshed: [] });
  }

  try {
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);
    const activeSlugs = [...new Set(
      allRows
        .filter((row) =>
          STATUS_DRIVEN_SERIES.has(row.seriesSlug) &&
          isActiveRaceWeekend(row.data as Race)
        )
        .map((row) => row.seriesSlug)
    )];

    if (!activeSlugs.length) return NextResponse.json({ ok: true, refreshed: [] });

    const season = new Date().getFullYear();
    const errors: string[] = [];

    for (const slug of activeSlugs) {
      try {
        await syncScheduleOnly(slug, season);
      } catch (err) {
        errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (errors.length) {
      await logError({ source: "cron/status-refresh", severity: "warning", message: errors.join("; ") });
    }
    return NextResponse.json({ ok: true, refreshed: activeSlugs, errors });
  } catch (err) {
    await logError({
      source: "cron/status-refresh",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
