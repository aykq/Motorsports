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

      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
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

          const lapColor = isRedFlag
            ? "text-red-400"
            : isSafetyCar
            ? "text-amber-400"
            : isPenalty
            ? "text-orange-400"
            : isGreen
            ? "text-green-500"
            : "text-muted-foreground";

          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-accent/20 transition-colors"
            >
              <span className={cn("w-8 text-right font-mono text-xs font-semibold shrink-0", lapColor)}>
                {event.lap != null ? `L${event.lap}` : "—"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{message}</p>
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
  );
}
