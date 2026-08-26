import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verifyCronSecret } from "@/lib/cron-auth";
import { fetchAndCacheNews } from "@/lib/scrapers/motorsportNews";
import { getShowNonF1Series } from "@/lib/app-settings";

const SUPPORTED_SERIES = ["f1", "motogp", "moto2", "wec"] as const;

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const showNonF1 = await getShowNonF1Series();
  const seriesToFetch = showNonF1 ? SUPPORTED_SERIES : SUPPORTED_SERIES.filter((s) => s === "f1");

  const results: Record<string, string> = {};
  await Promise.allSettled(
    seriesToFetch.map(async (slug) => {
      try {
        await fetchAndCacheNews(slug);
        results[slug] = "ok";
      } catch (err) {
        results[slug] = String(err);
      }
    })
  );

  // "max" → stale-while-revalidate. Boş obje ({}) geçmek tavsiye edilen kullanım
  // değil; expire tanımsız kaldığı için invalidation güvenilir çalışmıyordu.
  revalidateTag("news", "max");
  return NextResponse.json({ ok: true, results });
}
