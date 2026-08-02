import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getCachedSchedule } from "@/lib/cache";
import { syncRaceDetails } from "@/lib/race-detail";

// F1 yarış detayı backfill'i — son 14 gündeki tamamlanmış yarışlar için
// race control çevirisi, eksik practice/stint/sprint verisi tamamlanır.
// Tam sync'ten (6 saat) sonra çalışacak şekilde crontab'a eklenmeli.
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const season = new Date().getFullYear();
    const { races } = await getCachedSchedule("f1", season);
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = races.filter(
      (r) =>
        (r.status === "completed" && new Date(r.date).getTime() > fourteenDaysAgo) ||
        r.status === "live"
    );

    if (!recent.length) return NextResponse.json({ ok: true, synced: 0 });

    const result = await syncRaceDetails("f1", season, recent);
    if (result.errors.length) console.error("[cron/race-details] errors:", result.errors);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/race-details] fatal:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
