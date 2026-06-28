"use client";

import Link from "next/link";
import type { TireStint, TireCompound, RaceResult } from "@/types/series";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const COMPOUND_STYLES: Record<TireCompound, { bg: string; text: string }> = {
  SOFT: { bg: "bg-red-500/90", text: "text-white" },
  MEDIUM: { bg: "bg-yellow-400/95", text: "text-gray-900" },
  HARD: { bg: "bg-zinc-300/95 dark:bg-zinc-500/90", text: "text-gray-900 dark:text-gray-100" },
  INTERMEDIATE: { bg: "bg-green-500/90", text: "text-white" },
  WET: { bg: "bg-blue-500/90", text: "text-white" },
  UNKNOWN: { bg: "bg-zinc-600/70", text: "text-gray-200" },
};

interface Props {
  stints: TireStint[];
  results: RaceResult[];
  slug: string;
}

export function TireStints({ stints, results, slug }: Props) {
  const t = useTranslations("tireStints");
  if (!stints.length) return null;

  const totalLaps = Math.max(...stints.map((s) => s.lapEnd), 1);

  const driverNumberToId = new Map(
    results.filter((r) => r.driverNumber != null).map((r) => [r.driverNumber!, r.driverId])
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
        const name = driverNumberToName.get(driverNumber);
        const driverId = driverNumberToId.get(driverNumber);
        const fullName = name ?? `#${driverNumber}`;

        return (
          <div key={driverNumber} className="flex items-center gap-2 min-h-[28px]">
            {/* Position circle */}
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                position === 1 ? "bg-yellow-500/20 text-yellow-500" :
                position === 2 ? "bg-zinc-500/20 text-zinc-400" :
                position === 3 ? "bg-amber-700/20 text-amber-600" :
                "border border-border text-muted-foreground"
              )}
            >
              {position ?? "—"}
            </div>
            <div className="w-28 shrink-0">
              {driverId ? (
                <Link
                  href={`/${slug}/drivers/${driverId}`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors truncate block"
                >
                  {fullName}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground truncate block">{fullName}</span>
              )}
            </div>
            <div className="flex-1 flex h-7 rounded overflow-hidden gap-px">
              {driverStints
                .sort((a, b) => a.lapStart - b.lapStart)
                .map((stint, i) => {
                  const style = COMPOUND_STYLES[stint.compound];
                  const width = ((stint.lapEnd - stint.lapStart + 1) / totalLaps) * 100;
                  const lapCount = stint.lapEnd - stint.lapStart + 1;
                  return (
                    <div
                      key={i}
                      className={cn("relative flex items-center justify-center group", style.bg)}
                      style={{ width: `${width}%`, minWidth: "4px" }}
                      title={`${stint.compound} — L${stint.lapStart}–${stint.lapEnd} (${t("laps", { count: lapCount })}${stint.tyreAgeAtStart > 0 ? t("used", { age: stint.tyreAgeAtStart }) : ""})`}
                    >
                      {width > 18 && (
                        <span className={cn("text-[8px] leading-none font-mono select-none opacity-80", style.text)}>
                          {stint.lapStart}–{stint.lapEnd}
                        </span>
                      )}
                    </div>
                  );
                })}
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
              <div key={compound} className="flex items-center gap-1.5">
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
