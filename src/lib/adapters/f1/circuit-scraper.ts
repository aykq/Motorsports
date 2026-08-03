import * as cheerio from "cheerio";
import type { ScrapedCircuitData } from "@/types/series";

const TIMEOUT_MS = 15_000;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; motorsports-hub/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// circuitId → formula1.com/en/racing/{year}/{slug} — F1.com'un kendi slug'ları
// ülke/pist ismiyle tutarlı değil (ör. "bahrain" slug'ı 2026'da Sepang'ın sayfasını
// veriyor, "spain" Madrid'i veriyor), bu yüzden elle doğrulanıp tutulmalı.
// Bahrain (Sakhir) ve Jeddah 2026'da harita almıyor çünkü bu slug'lar o pistlerin
// sayfasına gitmiyor (bkz. sohbet geçmişi, 2026-08-03/04 curl doğrulaması).
export const F1_RACE_URL_SLUGS: Record<string, string> = {
  albert_park: "australia",
  shanghai: "china",
  suzuka: "japan",
  miami: "miami",
  villeneuve: "canada",
  monaco: "monaco",
  catalunya: "barcelona-catalunya",
  red_bull_ring: "austria",
  silverstone: "great-britain",
  spa: "belgium",
  hungaroring: "hungary",
  zandvoort: "netherlands",
  monza: "italy",
  madring: "spain",
  baku: "azerbaijan",
  sepang: "bahrain",
  marina_bay: "singapore",
  americas: "united-states",
  rodriguez: "mexico",
  interlagos: "brazil",
  las_vegas: "las-vegas",
  losail: "qatar",
  yas_marina: "united-arab-emirates",
};

function parseKm(text: string): number | null {
  const m = text.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function parseInt10(text: string): number | null {
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export async function scrapeF1CircuitData(
  circuitId: string,
  season: number
): Promise<ScrapedCircuitData | null> {
  const slug = F1_RACE_URL_SLUGS[circuitId];
  if (!slug) return null;

  try {
    const html = await fetchPage(`https://www.formula1.com/en/racing/${season}/${slug}`);
    const $ = cheerio.load(html);

    const stats: Record<string, { value: string; sub: string }> = {};
    $("dl dt").each((_, el) => {
      const label = $(el).text().trim();
      const parent = $(el).parent();
      const value = parent.find("dd").first().text().trim();
      const sub = parent.find("dd").first().siblings("span").first().text().trim();
      if (label) stats[label] = { value, sub };
    });

    const trackImageUrl = $('img[src*="/track/"][src*=".webp"]').first().attr("src") ?? null;

    const fastestLapValue = stats["Fastest lap time"]?.value;
    const fastestLapSub = stats["Fastest lap time"]?.sub ?? "";
    const fastestLapMatch = fastestLapSub.match(/^(.+?)\s*\((\d{4})\)$/);

    const data: ScrapedCircuitData = {
      lengthKm: stats["Circuit Length"] ? parseKm(stats["Circuit Length"].value) : null,
      officialLaps: stats["Number of Laps"] ? parseInt10(stats["Number of Laps"].value) : null,
      raceDistanceKm: stats["Race Distance"] ? parseKm(stats["Race Distance"].value) : null,
      firstGrandPrix: stats["First Grand Prix"] ? parseInt10(stats["First Grand Prix"].value) : null,
      fastestLap:
        fastestLapValue && fastestLapMatch
          ? { time: fastestLapValue, driver: fastestLapMatch[1], year: parseInt(fastestLapMatch[2], 10) }
          : null,
      trackImageUrl,
    };

    // Hiçbir alan çekilemediyse (sayfa yapısı değişmiş olabilir) null dön —
    // yarı-boş veriyle cache'i kirletme, çağıran taraf statik seed'e düşer.
    const hasAnyData = Object.values(data).some((v) => v !== null);
    return hasAnyData ? data : null;
  } catch {
    return null;
  }
}
