export async function register() {
  // Zamanlanmış işler production'da sunucudaki crontab + cron container'ı
  // tarafından /api/cron/* route'larına istek atılarak çalıştırılır.
  // src/lib/cron.ts yalnızca local geliştirme kolaylığı içindir — prod'da
  // yüklenmesi hem gereksiz hem de crontab'la çift çalışmaya yol açar.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    await import("./src/lib/cron");
  }
}
