"use client";

import { useState, useEffect } from "react";

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

export function Countdown({ targetDate, label = "Sonraki Yarışa", compact = false }: CountdownProps) {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft(targetDate));
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!time) return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-end justify-center gap-3">
        {["Gün", "Saat", "Dak", "San"].map((u, i) => (
          <div key={u} className="flex items-end gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black tabular-nums text-foreground leading-none">--</span>
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
        <p className="text-rose-500 font-bold">Başladı!</p>
      </div>
    );
  }

  const allUnits = [
    { value: time.days, label: "Gün" },
    { value: time.hours, label: "Saat" },
    { value: time.minutes, label: "Dak" },
    { value: time.seconds, label: "San" },
  ];
  const units = allUnits;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {units.map(({ value, label: unitLabel }, i) => (
          <div key={unitLabel} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-xl font-black tabular-nums text-foreground leading-none">
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
              <span className="text-3xl font-black tabular-nums text-foreground leading-none">
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
