import { db } from "@/db";
import { errorLog } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { sendPushToAdmins } from "@/lib/push";

const PUSH_THROTTLE_MS = 60 * 60 * 1000;

export interface LogErrorInput {
  source: string;
  severity: "error" | "warning";
  message: string;
  context?: Record<string, unknown>;
}

// Merkezi hata/uyarı kaydı — console'a basar, error_log tablosuna yazar,
// severity="error" ise (throttle'lı) admin'lere push bildirim atar.
// Kendi içindeki hatalar çağıranın akışını asla etkilemesin diye yutulur.
export async function logError({ source, severity, message, context }: LogErrorInput): Promise<void> {
  if (severity === "error") {
    console.error(`[${source}] ${message}`, context ?? "");
  } else {
    console.warn(`[${source}] ${message}`, context ?? "");
  }

  try {
    const [row] = await db
      .insert(errorLog)
      .values({ source, severity, message, context: context ?? null })
      .returning({ id: errorLog.id });

    if (severity === "error" && row) {
      await maybePushError(source, message, row.id);
    }
  } catch (err) {
    console.error("[error-log] insert failed:", err);
  }
}

async function maybePushError(source: string, message: string, rowId: string): Promise<void> {
  try {
    const since = new Date(Date.now() - PUSH_THROTTLE_MS);
    const recent = await db.query.errorLog.findFirst({
      where: and(
        eq(errorLog.source, source),
        eq(errorLog.message, message),
        gt(errorLog.pushedAt, since)
      ),
    });
    if (recent) return; // 1 saat içinde aynı source+message için zaten push atıldı

    await sendPushToAdmins({
      title: "Motorsports Hub — Error",
      body: `${source}: ${message}`.slice(0, 180),
    });

    await db.update(errorLog).set({ pushedAt: new Date() }).where(eq(errorLog.id, rowId));
  } catch (err) {
    console.error("[error-log] push failed:", err);
  }
}
