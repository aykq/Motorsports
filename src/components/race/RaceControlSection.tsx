"use client";

import { useState, useEffect } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { RaceControlEvent } from "@/types/series";

interface Props {
  events: RaceControlEvent[];
  eventsTr: string[];
}

export function RaceControlSection({ events, eventsTr }: Props) {
  const t = useTranslations("racePage");
  const [lang, setLang] = useState<"en" | "tr">("en");

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("tr")) setLang("tr");
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t("raceEvents")}
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
        <div className="relative">
          {/* Vertical timeline rail */}
          <div className="absolute left-[2.6rem] top-0 bottom-0 w-px bg-border pointer-events-none" />

          {events.map((event, i) => {
            const isRedFlag = event.flag === "RED";
            const isSafetyCar =
              event.category === "SafetyCar" ||
              event.message.toUpperCase().includes("SAFETY CAR");
            const isPenalty =
              event.message.toUpperCase().includes("PENALTY") ||
              event.message.toUpperCase().includes("INVESTIGATION");
            const isGreen = event.flag === "GREEN" || event.flag === "CHEQUERED";

            const raw = lang === "tr" ? (eventsTr[i] ?? event.message) : event.message;
            const message = raw.replace(/\s*\(\d{2}:\d{2}:\d{2}\)\s*$/, "").trim();

            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 text-xs hover:bg-accent/20 transition-colors relative",
                  "border-b border-border last:border-0",
                  isRedFlag && "bg-red-500/5",
                  isSafetyCar && "bg-yellow-500/5",
                  isPenalty && "bg-orange-500/5",
                )}
              >
                {/* Lap badge */}
                <div className="w-8 text-right text-muted-foreground shrink-0 pt-0.5 font-mono text-[10px]">
                  {event.lap != null ? `L${event.lap}` : "—"}
                </div>
                {/* Rail dot */}
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0 mt-1 z-10 ring-2 ring-background",
                    isRedFlag ? "bg-red-500" :
                    isSafetyCar ? "bg-yellow-500" :
                    isPenalty ? "bg-orange-500" :
                    isGreen ? "bg-green-500" :
                    "bg-border"
                  )}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium leading-snug",
                      isRedFlag && "text-red-400",
                      isSafetyCar && "text-yellow-400",
                    )}
                  >
                    {message}
                  </p>
                  {event.driverNumber && (
                    <p className="text-muted-foreground text-[10px]">
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
    </div>
  );
}
