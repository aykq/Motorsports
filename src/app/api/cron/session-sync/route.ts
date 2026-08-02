import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/db";
import { isActiveRaceWeekend, syncActiveSessionData } from "@/lib/race-detail";
import type { Race } from "@/types/series";

// Aktif yarış hafta sonlarında FP/quali/sprint/yarış seans verisini çeker.
// Crontab'dan sık aralıkla (2-5 dk) çağrılmalı — aktif hafta sonu yoksa hemen döner.
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const allRows = await db.query.cachedRaces.findMany().catch(() => []);
    const activeRows = allRows.filter((row) => isActiveRaceWeekend(row.data as Race));
    if (!activeRows.length) return NextResponse.json({ ok: true, active: 0 });

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

    if (errors.length) console.error("[cron/session-sync] errors:", errors);
    return NextResponse.json({ ok: true, active: activeRows.length, errors });
  } catch (err) {
    console.error("[cron/session-sync] fatal:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
