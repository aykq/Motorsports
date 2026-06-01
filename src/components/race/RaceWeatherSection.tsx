"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sun, Cloudy, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  Droplets, Wind,
} from "lucide-react";
import type { RaceSession, RaceStatus } from "@/types/series";

interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  code: number;
  precipProbability: number;
  precipUnit?: "mm" | "%";
  windSpeed: number;
}

interface LiveWeather {
  airTemp: number;
  trackTemp?: number;
  humidity?: number;
  windSpeed?: number;
  rainfall: boolean;
  source: "openf1" | "openmeteo";
}

const SESSION_LABELS: Record<string, string> = {
  practice1: "FP1",
  practice2: "FP2",
  practice3: "FP3",
  qualifying: "SIRA",
  sprintQuali: "SPR SIRA",
  sprint: "SPRINT",
  race: "YARIŞ",
};

const LIVE_POLL_MS = 30_000;
const OF1_HEADERS = { "User-Agent": "MotorsportsHub/1.0" };

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

function WmoIcon({ code, sizeClass }: { code: number; sizeClass: string }) {
  const cls = `${sizeClass} ${wmoColor(code)}`;
  if (code <= 1) return <Sun className={cls} />;
  if (code <= 48) return <Cloudy className={cls} />;
  if (code <= 55) return <CloudDrizzle className={cls} />;
  if (code <= 82) return <CloudRain className={cls} />;
  if (code <= 86) return <CloudSnow className={cls} />;
  return <CloudLightning className={cls} />;
}

function wmoDesc(code: number): string {
  if (code <= 1) return "Açık";
  if (code <= 3) return "Parçalı bulutlu";
  if (code <= 48) return "Bulutlu";
  if (code <= 55) return "Çiseleme";
  if (code <= 67) return "Yağmurlu";
  if (code <= 77) return "Karlı";
  if (code <= 82) return "Sağanak";
  return "Fırtınalı";
}

async function resolveMeetingKey(raceDate: string): Promise<number | null> {
  const year = new Date(raceDate).getFullYear();
  const raceTs = new Date(raceDate).getTime();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://api.openf1.org/v1/sessions?session_type=Race&year=${year}`,
      { headers: OF1_HEADERS, signal: controller.signal }
    );
    if (!res.ok) return null;
    const sessions: Array<{ meeting_key: number; date_start: string }> = await res.json();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nearby = sessions
      .filter((s) => Math.abs(new Date(s.date_start).getTime() - raceTs) < SEVEN_DAYS_MS)
      .sort(
        (a, b) =>
          Math.abs(new Date(a.date_start).getTime() - raceTs) -
          Math.abs(new Date(b.date_start).getTime() - raceTs)
      );
    return nearby[0]?.meeting_key ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenF1Weather(meetingKey: number): Promise<Omit<LiveWeather, "source"> | null> {
  const res = await fetch(
    `https://api.openf1.org/v1/weather?meeting_key=${meetingKey}`,
    { headers: OF1_HEADERS }
  );
  if (!res.ok) return null;
  const wx: Array<{
    air_temperature: number;
    track_temperature?: number;
    humidity?: number;
    wind_speed?: number;
    rainfall: number | boolean;
  }> = await res.json();
  if (!wx.length) return null;
  const last = wx[wx.length - 1];
  return {
    airTemp: Math.round(last.air_temperature),
    trackTemp: last.track_temperature != null ? Math.round(last.track_temperature) : undefined,
    humidity: last.humidity != null ? Math.round(last.humidity) : undefined,
    windSpeed: last.wind_speed != null ? Math.round(last.wind_speed) : undefined,
    rainfall: !!last.rainfall,
  };
}

interface Props {
  raceDate: string;
  sessions: RaceSession[];
  lat: number;
  lng: number;
  status: RaceStatus;
  accentColor: string;
  enableOpenF1?: boolean;
}

const FORECAST_HORIZON_DAYS = 16;

export function RaceWeatherSection({ raceDate, sessions, lat, lng, status, accentColor, enableOpenF1 = false }: Props) {
  const [forecast, setForecast] = useState<DayForecast[] | null>(null);
  const [live, setLive] = useState<LiveWeather | null>(null);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const meetingKeyRef = useRef<number | null>(null);

  const sessionDates = useMemo(() => [
    ...new Set(sessions.map((s) => new Date(s.date).toISOString().split("T")[0])),
  ].sort(), [sessions]);

  const daysUntilRace = useMemo(() => {
    const firstSession = sessionDates[0];
    if (!firstSession) return Infinity;
    return Math.ceil((new Date(firstSession).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [sessionDates]);

  const tooFarAhead = daysUntilRace > FORECAST_HORIZON_DAYS && status === "upcoming";

  const fetchForecast = useCallback(async () => {
    if (!sessionDates.length) return;
    try {
      const res = await fetch(
        `/api/weather?lat=${lat}&lng=${lng}&start_date=${sessionDates[0]}&end_date=${sessionDates[sessionDates.length - 1]}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.days) setForecast(data.days as DayForecast[]);
    } catch { /* silent */ }
  }, [lat, lng, sessionDates]);

  const fetchLiveWeather = useCallback(async (): Promise<boolean> => {
    try {
      if (!meetingKeyRef.current) {
        meetingKeyRef.current = await resolveMeetingKey(raceDate);
      }
      if (!meetingKeyRef.current) return false;

      const data = await fetchOpenF1Weather(meetingKeyRef.current);
      if (!data) return false;

      setLive({ ...data, source: "openf1" });
      setLiveUpdatedAt(new Date());
      return true;
    } catch {
      return false;
    }
  }, [raceDate]);

  const fetchMeteoLive = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&date=${today}`);
      if (!res.ok) return;
      const data: { temp: number; code: number } | null = await res.json();
      if (!data) return;
      setLive({
        airTemp: data.temp,
        rainfall: data.code >= 51,
        source: "openmeteo",
      });
    } catch { /* silent */ }
  }, [lat, lng]);

  useEffect(() => {
    if (tooFarAhead) {
      setLoading(false);
      return;
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function init() {
      setLoading(true);
      const isLiveOrCompleted = status === "live" || status === "completed";

      await Promise.allSettled([
        fetchForecast(),
        (async () => {
          if (!isLiveOrCompleted) return;
          if (enableOpenF1) {
            const ok = await fetchLiveWeather();
            if (!ok && !cancelled && status === "live") await fetchMeteoLive();
          } else if (status === "live") {
            await fetchMeteoLive();
          }
        })(),
      ]);

      if (!cancelled) setLoading(false);

      if (status === "live" && !cancelled) {
        interval = setInterval(async () => {
          if (cancelled) return;
          if (enableOpenF1) {
            const ok = await fetchLiveWeather();
            if (!ok) await fetchMeteoLive();
          } else {
            await fetchMeteoLive();
          }
        }, LIVE_POLL_MS);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [status, fetchForecast, fetchLiveWeather, fetchMeteoLive, tooFarAhead]);

  if (tooFarAhead) {
    const daysUntilAvailable = daysUntilRace - FORECAST_HORIZON_DAYS;
    const availableDate = new Date(Date.now() + daysUntilAvailable * 24 * 60 * 60 * 1000);
    const availableDateStr = availableDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    return (
      <section className="space-y-2">
        <SectionHeader />
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Sun className="w-4 h-4 shrink-0 opacity-40" />
          <span>
            {daysUntilAvailable === 1
              ? "Hava tahmini yarın görünecek"
              : `Hava tahmini ${availableDateStr} itibarıyla görünecek`}
          </span>
        </div>
      </section>
    );
  }

  if (loading && !forecast && !live) {
    return (
      <section className="space-y-2">
        <SectionHeader />
        <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
          <div className="h-16 bg-white/5 rounded-lg" />
        </div>
      </section>
    );
  }

  if (!forecast && !live) return null;

  return (
    <section className="space-y-2">
      <SectionHeader />

      {live && (
        <div className="rounded-lg border border-border bg-card px-3 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {status === "live"
                ? live.source === "openf1" ? "Anlık Hava — OpenF1" : "Anlık Hava — Open-Meteo"
                : live.source === "openf1" ? "Yarış Günü Hava — OpenF1" : "Yarış Günü Hava — Open-Meteo"}
            </p>
            {status === "live" && (
              <div className="flex items-center gap-1.5">
                {live.source === "openf1" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                )}
                {liveUpdatedAt && (
                  <span className="text-[10px] text-muted-foreground/50">
                    {liveUpdatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Hava" value={`${live.airTemp}°C`} />
            {live.trackTemp != null && <Stat label="Pist" value={`${live.trackTemp}°C`} />}
            {live.humidity != null && <Stat label="Nem" value={`${live.humidity}%`} />}
            {live.windSpeed != null && <Stat label="Rüzgar" value={`${live.windSpeed} km/h`} />}
          </div>

          {live.rainfall && (
            <div className="flex items-center gap-2 text-sky-400 bg-sky-400/10 rounded-md px-2.5 py-1.5">
              <CloudRain className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Yağmur Aktif</span>
            </div>
          )}
        </div>
      )}

      {forecast && forecast.length > 0 && (
        <div className="space-y-2">
          {forecast.length > 1 && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Haftalık Tahmin
            </p>
          )}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(forecast.length, 4)}, minmax(0, 1fr))` }}
          >
            {forecast.map((day) => {
              const daySessions = sessions.filter(
                (s) => new Date(s.date).toISOString().split("T")[0] === day.date
              );
              const isRaceDay = daySessions.some((s) => s.type === "race");

              return (
                <div
                  key={day.date}
                  className="rounded-lg border bg-card px-2 py-2.5 flex flex-col items-center gap-1.5 relative overflow-hidden"
                  style={
                    isRaceDay
                      ? { borderColor: `${accentColor}50`, backgroundColor: `${accentColor}08` }
                      : undefined
                  }
                >
                  {isRaceDay && (
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: accentColor }}
                    />
                  )}

                  <p className="text-[10px] text-muted-foreground uppercase">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString("tr-TR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>

                  <WmoIcon code={day.code} sizeClass="w-6 h-6" />

                  <div className="text-center leading-tight">
                    <p className="text-sm font-semibold">{day.tempMax}°</p>
                    <p className="text-[10px] text-muted-foreground">{day.tempMin}°</p>
                  </div>

                  <p className="text-[10px] text-muted-foreground/70 text-center">
                    {wmoDesc(day.code)}
                  </p>

                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <span className="flex items-center gap-0.5">
                      <Droplets className="w-3 h-3 text-sky-500/70" />
                      <span className="text-[10px]">{day.precipProbability}{day.precipUnit ?? "%"}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-3 h-3" />
                      <span className="text-[10px]">{day.windSpeed}</span>
                    </span>
                  </div>

                  {daySessions.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {daySessions.map((s) => (
                        <span
                          key={s.type}
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={
                            s.type === "race"
                              ? { backgroundColor: `${accentColor}30`, color: accentColor }
                              : { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }
                          }
                        >
                          {SESSION_LABELS[s.type] ?? s.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground/40 text-right">
            Kaynak: Open-Meteo
          </p>
        </div>
      )}
    </section>
  );
}

function SectionHeader() {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
      Hava Durumu
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-base font-semibold leading-none">{value}</span>
    </div>
  );
}
