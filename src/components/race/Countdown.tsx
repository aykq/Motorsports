"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface CountdownProps {
  targetDate: string;
  label?: string;
  compact?: boolean;
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

export function Countdown({ targetDate, label, compact = false }: CountdownProps) {
  const t = useTranslations("countdown");
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft(targetDate));
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const unitLabels = [t("days"), t("hours"), t("minutes"), t("seconds")];

  if (!time) return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-end justify-center gap-3">
        {unitLabels.map((u, i) => (
          <div key={u} className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold tabular-nums text-foreground leading-none">--</span>
              <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{u}</span>
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
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
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
              <span className="text-xl font-mono font-bold tabular-nums text-foreground leading-none">
                {pad(value)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {unitLabel}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-base font-bold text-muted-foreground/50 mb-2">:</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-end justify-center gap-3">
        {units.map(({ value, label: unitLabel }, i) => (
          <div key={unitLabel} className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold tabular-nums text-foreground leading-none">
                {pad(value)}
              </span>
              <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
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
