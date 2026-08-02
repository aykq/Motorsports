# Zamanlanmış İşler (Cron)

Production'da **hiçbir zamanlama uygulama içinde çalışmaz.** Tüm periyodik işler
dışarıdan HTTP isteğiyle tetiklenir. İki tetikleyici var:

| Tetikleyici | Nerede | Ne yapıyor |
|---|---|---|
| Sunucu crontab'ı (`crontab -e`, root) | `194.62.54.96` | Bildirim, sync, seans verisi |
| `cron` container'ı | `docker-compose.yml` | Sadece haber çekimi |

`src/lib/cron.ts` (node-cron) **sadece local geliştirmede** yüklenir
(`instrumentation.ts` içinde `NODE_ENV !== "production"` koşuluyla). Production'da
yüklenmez; yüklenseydi crontab'la çift çalışırdı.

> **Yeni bir zamanlanmış iş eklerken:** `src/lib/cron.ts`'e eklemek yeterli
> değildir — prod'da çalışmaz. Karşılık gelen `/api/cron/*` route'unu ve aşağıdaki
> crontab satırını da eklemelisin.

## Kimlik doğrulama

Tüm `/api/cron/*` route'ları `x-cron-secret` header'ı ister
(`CRON_SECRET` env değişkeni, bkz. `src/lib/cron-auth.ts`). Eksik/yanlış → `403`.

## Sunucu crontab'ı

`$SECRET` yerine sunucudaki `.env` dosyasındaki `CRON_SECRET` değeri yazılır.

```cron
# Seans bildirimleri — 10 dakikada bir
1-51/10 * * * * curl -s -X POST http://localhost:3000/api/cron/notify -H "x-cron-secret: $SECRET" -H "Content-Type: application/json" -d {} >> /var/log/motorsports-notify.log 2>&1

# Yarış sonrası sonuç yenileme — 30 dakikada bir
15,45 * * * * for s in f1 motogp moto2 moto3 wec gt3 gt4 carrera-cup; do curl -s -X POST http://localhost:3000/api/sync/$s -H "x-cron-secret: $SECRET" >> /var/log/motorsports-sync.log 2>&1; done

# Tam sync — 6 saatte bir
0 0,6,12,18 * * * for s in f1 motogp moto2 moto3 wec gt3 gt4 carrera-cup; do curl -s -X POST http://localhost:3000/api/sync/$s -H "x-cron-secret: $SECRET" >> /var/log/motorsports-sync.log 2>&1; done

# --- Aşağıdakiler 2026-08-03'te eklendi (önceden prod'da HİÇ çalışmıyordu) ---

# Aktif seans verisi (FP/quali/sprint/yarış) — 2 dakikada bir
# Aktif yarış hafta sonu yoksa route hemen döner, maliyeti yok.
2-58/2 * * * * curl -s -X POST http://localhost:3000/api/cron/session-sync -H "x-cron-secret: $SECRET" >> /var/log/motorsports-sync.log 2>&1

# MotoGP/WEC yarış durumu tazeleme — 10 dakikada bir
3-59/10 * * * * curl -s -X POST http://localhost:3000/api/cron/status-refresh -H "x-cron-secret: $SECRET" >> /var/log/motorsports-sync.log 2>&1

# F1 yarış detayı backfill — tam sync'ten 20 dk sonra
20 0,6,12,18 * * * curl -s -X POST http://localhost:3000/api/cron/race-details -H "x-cron-secret: $SECRET" >> /var/log/motorsports-sync.log 2>&1
```

## Haber çekimi

`docker-compose.yml` içindeki `cron` servisi `/api/cron/news`'e POST atar.
2026-08-03'te periyot 3 saatten (`0 */3 * * *`) **saatte bire** (`25 * * * *`)
indirildi — haberlerin "otomatik güncellenmiyor" gibi görünmesinin sebebi bu
gecikmeydi.

Dakika olarak `:25` seçildi çünkü diğer işlerle çakışmıyor: notify `:x1`,
status-refresh `:x3`, session-sync çift dakikalar, post-race sync `:15`/`:45`,
tam sync `:00`, race-details `:20`.

> Bu değişiklik deploy'da `cron` container'ının yeniden yaratılmasını gerektirir
> (`docker compose up -d`), CI/CD zaten bunu yapıyor.

## Neden bu kadar dağınık?

Tarihsel: önce app-içi `node-cron` yazıldı, sonra prod'da çalışmadığı fark
edilmeden sunucu crontab'ı ve cron container'ı eklendi. 2026-08-03'te app-içi
cron'un production'da hiç çalışmadığı tespit edildi (kanıt: prod app loglarında
`[cron] scheduled: ...` satırı yok, haber scrape zaman damgalarının tamamı
container cron'un `:00` deseninde, app cron'un `:30` deseninde tek kayıt yok).
O ana kadar `syncActiveSessionData`, `syncRaceDetails` ve status refresh
production'da hiçbir yerden çalışmıyordu.
