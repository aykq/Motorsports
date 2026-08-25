import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/db";
import { isActiveRaceWeekend, syncActiveSessionData, syncPendingRaceControl } from "@/lib/race-detail";
import type { Race } from "@/types/series";
import { logError } from "@/lib/error-log";

// Aktif yarış hafta sonlarında FP/quali/sprint/yarış seans verisini çeker.
// Ayrıca aktif hafta sonu penceresi kapandıktan sonra da (yarış bitti ama race
// control hâlâ eksikse) kısa aralıklarla denemeye devam eder — kullanıcı sayfayı
// açmadan veri hazır olsun diye.
// Crontab'dan sık aralıkla (2-5 dk) çağrılmalı — yapacak iş yoksa hemen döner.
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);
    const activeRows = allRows.filter((row) => isActiveRaceWeekend(row.data as Race));
    const season = new Date().getFullYear();
    const errors: string[] = [];

    for (const row of activeRows) {
      const race = row.data as Race;
      try {
        await syncActiveSessionData(row.seriesSlug, season, race);
      } catch (err) {
        errors.push(`${row.seriesSlug} R${race.round}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    try {
      const f1Races = allRows.filter((row) => row.seriesSlug === "f1").map((row) => row.data as Race);
      await syncPendingRaceControl("f1", season, f1Races);
    } catch (err) {
      errors.push(`f1 race-control catchup: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (errors.length) {
      await logError({ source: "cron/session-sync", severity: "warning", message: errors.join("; ") });
    }
    return NextResponse.json({ ok: true, active: activeRows.length, errors });
  } catch (err) {
    await logError({
      source: "cron/session-sync",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
