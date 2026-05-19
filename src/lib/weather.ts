import { z } from "zod";
import type { WeatherDay } from "@/types/series";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const OpenMeteoResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()),
    wind_speed_10m_max: z.array(z.number().nullable()),
    weather_code: z.array(z.number().nullable()),
  }),
});

export const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Açık hava",
  1: "Çoğunlukla açık",
  2: "Parçalı bulutlu",
  3: "Kapalı",
  45: "Sisli",
  48: "Kırağı",
  51: "Hafif çisenti",
  53: "Çisenti",
  55: "Yoğun çisenti",
  61: "Hafif yağmur",
  63: "Yağmurlu",
  65: "Şiddetli yağmur",
  71: "Hafif kar",
  73: "Karlı",
  75: "Yoğun kar",
  80: "Hafif sağanak",
  81: "Sağanak yağışlı",
  82: "Yoğun sağanak",
  95: "Fırtınalı",
  96: "Dolulu fırtına",
  99: "Yoğun dolulu fırtına",
};

export async function fetchRaceWeather(
  lat: number,
  lng: number,
  raceDateStr: string,
  daysBefore = 3
): Promise<WeatherDay[]> {
  try {
    const raceDate = new Date(raceDateStr);
    const startDate = new Date(raceDate);
    startDate.setDate(startDate.getDate() - daysBefore);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(maxForecastDate.getDate() + 15);

    if (startDate > maxForecastDate || raceDate < today) return [];

    const effectiveStart = startDate < today ? today : startDate;
    const effectiveEnd = raceDate > maxForecastDate ? maxForecastDate : raceDate;

    const start = effectiveStart.toISOString().split("T")[0];
    const end = effectiveEnd.toISOString().split("T")[0];

    const url = `${BASE_URL}?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto&start_date=${start}&end_date=${end}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];
      const data = OpenMeteoResponseSchema.parse(await res.json());
      const d = data.daily;
      return d.time.map((date, i) => ({
        date,
        tempMax: Math.round(d.temperature_2m_max[i] ?? 0),
        tempMin: Math.round(d.temperature_2m_min[i] ?? 0),
        precipitationProbability: d.precipitation_probability_max[i] ?? 0,
        windSpeed: Math.round(d.wind_speed_10m_max[i] ?? 0),
        weatherCode: d.weather_code[i] ?? 0,
      }));
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [];
  }
}
