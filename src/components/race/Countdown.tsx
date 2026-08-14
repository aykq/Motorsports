"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: string;
  label?: string;
  compact?: boolean;
  /** Force light text — for use over a dark photo scrim, where the background doesn't follow the site theme. */
  invert?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function getTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Countdown({ targetDate, label, compact = false, invert = false }: CountdownProps) {
  const t = useTranslations("countdown");
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    // Starts at null so server and first client render match (avoids a hydration
    // mismatch on this per-second value); setting it immediately here (rather than
    // waiting for the first interval tick) avoids an extra second of "--:--" flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(getTimeLeft(targetDate));
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const unitLabels = [t("days"), t("hours"), t("minutes"), t("seconds")];

  if (!time) return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground tracking-wide mb-3">{label}</p>
      <div className="flex items-end justify-center gap-3">
        {unitLabels.map((u, i) => (
          <div key={u} className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold tabular-nums text-foreground leading-none">--</span>
              <span className="text-xs text-muted-foreground mt-1 tracking-wide">{u}</span>
            </div>
            {i < 3 && <span className="text-2xl font-bold text-muted-foreground/50 mb-1">:</span>}
          </div>
        ))}
      </div>
    </div>
  );

  if (time.expired) {
    return (
      <div className="text-center">
        <p className="text-xs text-muted-foreground tracking-wide mb-2">{label}</p>
        <p className="text-rose-500 font-bold">{t("started")}</p>
      </div>
    );
  }

  const units = [
    { value: time.days, label: t("days") },
    { value: time.hours, label: t("hours") },
    { value: time.minutes, label: t("minutes") },
    { value: time.seconds, label: t("seconds") },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {units.map(({ value, label: unitLabel }, i) => (
          <div key={unitLabel} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className={cn("text-xl font-mono font-bold tabular-nums leading-none", invert ? "text-white" : "text-foreground")}>
                {pad(value)}
              </span>
              <span className={cn("text-[10px] tracking-wide", invert ? "text-white/70" : "text-muted-foreground")}>
                {unitLabel}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className={cn("text-base font-bold mb-2", invert ? "text-white/40" : "text-muted-foreground/50")}>:</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground tracking-wide mb-3">{label}</p>
      <div className="flex items-end justify-center gap-3">
        {units.map(({ value, label: unitLabel }, i) => (
          <div key={unitLabel} className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold tabular-nums text-foreground leading-none">
                {pad(value)}
              </span>
              <span className="text-xs text-muted-foreground mt-1 tracking-wide">
                {unitLabel}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-2xl font-bold text-muted-foreground/50 mb-1">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
