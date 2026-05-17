import cron from "node-cron";
import { syncSeries } from "@/lib/sync";
import { adapters } from "@/lib/adapters";

const SEASON = new Date().getFullYear();

cron.schedule(
  "0 6 * * *",
  async () => {
    console.log("[cron] daily sync started");
    for (const slug of Object.keys(adapters)) {
      try {
        const result = await syncSeries(slug, SEASON);
        console.log(`[cron] ${slug}: ${result.racesCount} races, ${result.driversCount} drivers`);
        if (result.errors.length) console.error(`[cron] ${slug} errors:`, result.errors);
      } catch (err) {
        console.error(`[cron] ${slug} failed:`, err);
      }
    }
    console.log("[cron] daily sync finished");
  },
  { timezone: "UTC" }
);

console.log("[cron] scheduled daily sync at 06:00 UTC");
