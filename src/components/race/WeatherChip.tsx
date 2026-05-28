"use client";

import { useState, useEffect } from "react";
import { Sun, CloudRain, Cloudy, CloudDrizzle, CloudSnow, CloudLightning } from "lucide-react";

interface WeatherState {
  temp: number;
  rainfall: boolean;
  wmoCode?: number;
}

function wmoColor(code: number): string {
  if (code <= 1)  return "text-yellow-400";
  if (code <= 3)  return "text-zinc-300";
  if (code <= 48) return "text-zinc-400";
  if (code <= 55) return "text-sky-400";
  if (code <= 67) return "text-blue-400";
  if (code <= 77) return "text-slate-200";
  if (code <= 82) return "text-blue-500";
  return "text-amber-400";
}

function WeatherIcon({ rainfall, wmoCode, sizeClass }: { rainfall: boolean; wmoCode?: number; sizeClass: string }) {
  const code = wmoCode ?? (rainfall ? 61 : 0);
  const cls = `${sizeClass} ${wmoColor(code)}`;
  if (code <= 1) return <Sun className={cls} />;
  if (code <= 48) return <Cloudy className={cls} />;
  if (code <= 55) return <CloudDrizzle className={cls} />;
  if (code <= 82) return <CloudRain className={cls} />;
  if (code <= 86) return <CloudSnow className={cls} />;
  return <CloudLightning className={cls} />;
}

const HEADERS = { "User-Agent": "MotorsportsHub/1.0 (personal project)" };
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

async function fetchFromOpenF1(raceDate: string): Promise<WeatherState | null> {
  try {
    const year = new Date(raceDate).getFullYear();
    const raceTs = new Date(raceDate).getTime();

    const sessRes = await fetch(`https://api.openf1.org/v1/sessions?year=${year}`, { headers: HEADERS });
    if (!sessRes.ok) return null;

    const sessions: Array<{ meeting_key: number; date_start: string }> = await sessRes.json();
    const nearby = sessions.filter(s => Math.abs(new Date(s.date_start).getTime() - raceTs) < FOUR_DAYS_MS);
    if (!nearby.length) return null;

    const meetingKey = nearby[0].meeting_key;
    const wxRes = await fetch(`https://api.openf1.org/v1/weather?meeting_key=${meetingKey}`, { headers: HEADERS });
    if (!wxRes.ok) return null;

    const wx: Array<{ air_temperature: number; rainfall: number | boolean }> = await wxRes.json();
    if (!wx.length) return null;

    const latest = wx[wx.length - 1];
    return { temp: Math.round(latest.air_temperature), rainfall: !!latest.rainfall };
  } catch {
    return null;
  }
}

async function fetchFromOpenMeteo(raceDate: string, lat: number, lng: number): Promise<WeatherState | null> {
  try {
    const date = new Date(raceDate).toISOString().split("T")[0];
    const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&date=${date}`);
    if (!res.ok) return null;
    const data: { temp: number; code: number } | null = await res.json();
    if (!data) return null;
    return { temp: data.temp, rainfall: data.code >= 51, wmoCode: data.code };
  } catch {
    return null;
  }
}

interface WeatherChipProps {
  raceDate: string;
  lat?: number;
  lng?: number;
}

export function WeatherChip({ raceDate, lat, lng }: WeatherChipProps) {
  const [weather, setWeather] = useState<WeatherState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const f1 = await fetchFromOpenF1(raceDate);
      if (f1 && !cancelled) { setWeather(f1); return; }

      if (!lat || !lng || cancelled) return;
      const meteo = await fetchFromOpenMeteo(raceDate, lat, lng);
      if (meteo && !cancelled) setWeather(meteo);
    }

    load();
    return () => { cancelled = true; };
  }, [raceDate, lat, lng]);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1 bg-background/60 backdrop-blur px-2 py-1 rounded-lg border border-border">
      <WeatherIcon rainfall={weather.rainfall} wmoCode={weather.wmoCode} sizeClass="w-3.5 h-3.5 shrink-0" />
      <span className="font-sans text-[11px] font-medium tabular-nums">{weather.temp}°C</span>
    </div>
  );
}
