/**
 * Jolpica/Ergast API'sinde listelenmeyen iptal yarışlar.
 * API bu yarışları veritabanından tamamen kaldırdığı için
 * sonuç-bazlı iptal tespiti işe yaramıyor; manuel olarak tutuyoruz.
 *
 * Kaynak: Sky Sports F1, GPFans, RacingNews365 (Mayıs 2026)
 */

import type { Race } from "@/types/series";

/**
 * Round sayısı 900+ olan yarışlar manuel override'dır.
 * Normal F1 sezonu max ~24 yarış içerdiğinden çakışma olmaz.
 */
export const CANCELLED_RACE_OVERRIDES: Record<number, Omit<Race, "round" | "status">[]> = {
  2026: [
    {
      // İptal: Orta Doğu'daki İran savaşı (14 Mart 2026 açıklaması)
      name: "Bahrain Grand Prix",
      circuitId: "bahrain",
      circuitName: "Bahrain International Circuit",
      location: "Sakhir",
      country: "Bahrain",
      date: "2026-04-12T15:00:00+03:00",
      sessions: [
        { type: "practice1", date: "2026-04-10T11:30:00+03:00" },
        { type: "practice2", date: "2026-04-10T15:00:00+03:00" },
        { type: "practice3", date: "2026-04-11T11:30:00+03:00" },
        { type: "qualifying", date: "2026-04-11T15:00:00+03:00" },
        { type: "race", date: "2026-04-12T15:00:00+03:00" },
      ],
      circuitLat: 26.0325,
      circuitLng: 50.5106,
    },
    {
      // İptal: Orta Doğu'daki İran savaşı (14 Mart 2026 açıklaması)
      name: "Saudi Arabian Grand Prix",
      circuitId: "jeddah",
      circuitName: "Jeddah Corniche Circuit",
      location: "Jeddah",
      country: "Saudi Arabia",
      date: "2026-04-19T20:00:00+03:00",
      sessions: [
        { type: "practice1", date: "2026-04-17T17:30:00+03:00" },
        { type: "practice2", date: "2026-04-17T21:00:00+03:00" },
        { type: "practice3", date: "2026-04-18T17:30:00+03:00" },
        { type: "qualifying", date: "2026-04-18T21:00:00+03:00" },
        { type: "race", date: "2026-04-19T20:00:00+03:00" },
      ],
      circuitLat: 21.6319,
      circuitLng: 39.1044,
    },
  ],
};

/**
 * Belirtilen sezon için override yarışları Round=900+ ile Race[] olarak döner.
 */
export function getCancelledRaceOverrides(season: number): Race[] {
  const overrides = CANCELLED_RACE_OVERRIDES[season] ?? [];
  return overrides.map((r, i) => ({
    ...r,
    round: 900 + i,
    status: "cancelled" as const,
  }));
}
