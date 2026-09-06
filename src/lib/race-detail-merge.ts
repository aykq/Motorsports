import type { RaceDetail } from "@/types/series";

// OpenF1'den gelen dizi alanları ile onların "fetch gerçekten başarılı oldu mu"
// bayrağı. fetchOpenF1PracticeResults/Stints/RaceControl bir hata durumunda boş
// dizi döndürebiliyor (429/401/timeout) — "veri yok" ile "fetch patladı" bu
// yüzden ayırt edilemiyordu ve syncRaceDetails/syncActiveSessionData bunu
// koşulsuz olarak DB'ye yazınca daha önce dolu olan seans sonuçları siliniyordu.
const GUARDED_FIELDS: ReadonlyArray<
  readonly [keyof RaceDetail, keyof RaceDetail]
> = [
  ["practice1Results", "practice1Fetched"],
  ["practice2Results", "practice2Fetched"],
  ["practice3Results", "practice3Fetched"],
  ["tireStints", "stintsFetched"],
  ["raceControl", "raceControlFetched"],
];

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

/**
 * `fresh` (yeni fetch sonucu) ile `stored` (DB'deki mevcut kayıt) birleştirir.
 * OpenF1 kaynaklı dizi alanları için kural: yeni fetch başarısızsa (bayrak
 * `true` değil) ve dizisi boşsa, mevcut dolu veriyi ASLA ezme. Jolpica/standings/
 * weather gibi diğer tüm alanlar olduğu gibi `fresh`'ten gelir.
 */
export function mergeFetchedRaceDetail(
  stored: RaceDetail | null,
  fresh: RaceDetail
): RaceDetail {
  const merged: RaceDetail = { ...fresh };
  if (!stored) return merged;

  for (const [field, flag] of GUARDED_FIELDS) {
    const freshFetchedOk = fresh[flag] === true;
    if (freshFetchedOk) {
      // Fetch gerçekten çalıştı — boş dönse bile geçerli, fresh'i kullan.
      (merged[flag] as boolean) = true;
      continue;
    }
    // Fetch başarısız/atlandı.
    if (len(fresh[field]) === 0 && len(stored[field]) > 0) {
      (merged[field] as unknown) = stored[field];
    }
    // Daha önce başarılı çekilmiş bir bayrağı geçici bir hata düşürmesin.
    if (stored[flag] === true) {
      (merged[flag] as boolean) = true;
    }
  }

  return merged;
}
