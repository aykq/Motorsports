"use client";

import type { TireStint, TireCompound, RaceResult } from "@/types/series";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const COMPOUND_STYLES: Record<TireCompound, { bg: string; label: string; text: string }> = {
  SOFT: { bg: "bg-red-600", label: "S", text: "text-white" },
  MEDIUM: { bg: "bg-yellow-400", label: "M", text: "text-black" },
  HARD: { bg: "bg-zinc-300 dark:bg-zinc-500", label: "H", text: "text-black dark:text-white" },
  INTERMEDIATE: { bg: "bg-green-500", label: "I", text: "text-white" },
  WET: { bg: "bg-blue-500", label: "W", text: "text-white" },
  UNKNOWN: { bg: "bg-zinc-600", label: "", text: "text-white" },
};

interface Props {
  stints: TireStint[];
  results: RaceResult[];
}

export function TireStints({ stints, results }: Props) {
  const t = useTranslations("tireStints");
  if (!stints.length) return null;

  const totalLaps = Math.max(...stints.map((s) => s.lapEnd), 1);

  const driverNumberToCode = new Map(
    results.filter((r) => r.driverCode).map((r) => [r.driverNumber, r.driverCode!])
  );

  const driverNumberToName = new Map(
    results.map((r) => [r.driverNumber, r.driverName])
  );

  const driverNumberToPosition = new Map(
    results.map((r) => [r.driverNumber, r.position])
  );

  const grouped = new Map<number, TireStint[]>();
  for (const stint of stints) {
    const existing = grouped.get(stint.driverNumber) ?? [];
    grouped.set(stint.driverNumber, [...existing, stint]);
  }

  const sortedDrivers = [...grouped.keys()].sort((a, b) => {
    const posA = driverNumberToPosition.get(a) ?? 99;
    const posB = driverNumberToPosition.get(b) ?? 99;
    return posA - posB;
  });

  return (
    <div className="space-y-1">
      {sortedDrivers.map((driverNumber) => {
        const driverStints = grouped.get(driverNumber) ?? [];
        const position = driverNumberToPosition.get(driverNumber);
        const code = driverNumberToCode.get(driverNumber);
        const name = driverNumberToName.get(driverNumber);
        const displayName = code ?? (name ? name.split(" ").pop() : `#${driverNumber}`);

        return (
          <div key={driverNumber} className="flex items-center gap-2 min-h-[28px]">
            <div className="w-4 text-xs text-right text-muted-foreground shrink-0">
              {position ?? "—"}
            </div>
            <div className="w-12 text-xs text-muted-foreground truncate shrink-0 font-mono">
              {displayName}
            </div>
            <div className="flex-1 flex h-5 rounded overflow-hidden gap-px">
              {driverStints
                .sort((a, b) => a.lapStart - b.lapStart)
                .map((stint, i) => {
                  const style = COMPOUND_STYLES[stint.compound];
                  const width = ((stint.lapEnd - stint.lapStart + 1) / totalLaps) * 100;
                  return (
                    <div
                      key={i}
                      className={cn("relative flex items-center justify-center group", style.bg)}
                      style={{ width: `${width}%`, minWidth: "4px" }}
                      title={`${stint.compound} — L${stint.lapStart}–${stint.lapEnd} (${t("laps", { count: stint.lapEnd - stint.lapStart + 1 })}${stint.tyreAgeAtStart > 0 ? t("used", { age: stint.tyreAgeAtStart }) : ""})`}
                    >
                      {width > 8 && (
                        <span className={cn("text-[9px] font-bold leading-none select-none", style.text)}>
                          {style.label}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="w-8 text-right text-[10px] text-muted-foreground shrink-0">
              {driverStints.length}st
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2 flex-wrap">
        {(Object.keys(COMPOUND_STYLES) as TireCompound[])
          .filter((c) => stints.some((s) => s.compound === c))
          .map((compound) => {
            const style = COMPOUND_STYLES[compound];
            return (
              <div key={compound} className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", style.bg)} />
                <span className="text-[10px] text-muted-foreground">{compound}</span>
              </div>
            );
          })}
        <span className="text-[10px] text-muted-foreground ml-auto">{t("total", { laps: totalLaps })}</span>
      </div>
    </div>
  );
}
