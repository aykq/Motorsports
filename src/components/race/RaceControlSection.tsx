"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Flag, CircleDot, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaceControlEvent } from "@/types/series";

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  RED: { label: "Kırmızı Bayrak", color: "text-red-500" },
  YELLOW: { label: "Sarı Bayrak", color: "text-yellow-500" },
  DOUBLE_YELLOW: { label: "Çift Sarı", color: "text-yellow-400" },
  GREEN: { label: "Yeşil Bayrak", color: "text-green-500" },
  CHEQUERED: { label: "Damalı Bayrak", color: "text-foreground" },
  BLACK: { label: "Siyah Bayrak", color: "text-foreground" },
  BLACK_AND_WHITE: { label: "Siyah-Beyaz", color: "text-foreground" },
};

interface Props {
  events: RaceControlEvent[];
  eventsTr: string[];
}

export function RaceControlSection({ events, eventsTr }: Props) {
  const [lang, setLang] = useState<"en" | "tr">("en");

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("tr")) setLang("tr");
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Yarış Olayları
        </h2>
        <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
          <Languages className="w-3 h-3 text-muted-foreground ml-1.5" />
          {(["en", "tr"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                lang === l
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {events.map((event, i) => {
          const flagStyle = event.flag ? FLAG_LABELS[event.flag] : null;
          const isSafetyCar =
            event.category === "SafetyCar" ||
            event.message.toUpperCase().includes("SAFETY CAR");
          const isPenalty =
            event.message.toUpperCase().includes("PENALTY") ||
            event.message.toUpperCase().includes("INVESTIGATION");
          const raw = lang === "tr" ? (eventsTr[i] ?? event.message) : event.message;
          const message = raw.replace(/\s*\(\d{2}:\d{2}:\d{2}\)\s*$/, "").trim();

          return (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 text-xs hover:bg-accent/30 transition-colors"
            >
              <div className="w-8 text-right text-muted-foreground shrink-0 pt-0.5">
                {event.lap != null ? `L${event.lap}` : "—"}
              </div>
              <div className="shrink-0 pt-0.5">
                {isSafetyCar ? (
                  <CircleDot className="w-3.5 h-3.5 text-yellow-500" />
                ) : isPenalty ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                ) : (
                  <Flag
                    className={cn(
                      "w-3.5 h-3.5",
                      flagStyle?.color ?? "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{message}</p>
                {event.driverNumber && (
                  <p className="text-muted-foreground">
                    #{event.driverNumber}
                    {event.driverAcronym && ` — ${event.driverAcronym}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
