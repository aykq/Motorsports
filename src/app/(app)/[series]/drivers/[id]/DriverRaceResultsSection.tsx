"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { RaceResult, RaceWithYear } from "@/types/series";

interface RaceResultEntry {
  race: RaceWithYear;
  result: RaceResult;
}

interface Props {
  slug: string;
  raceResults: RaceResultEntry[];
}

function positionBadge(pos: number, status: string) {
  const isDNF = status !== "Finished" && !/^\+/.test(status) && status !== "";
  if (isDNF)
    return (
      <span className="w-10 text-center text-xs font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
        DNF
      </span>
    );
  if (pos === 1)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 shrink-0">
        P1
      </span>
    );
  if (pos === 2)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 shrink-0">
        P2
      </span>
    );
  if (pos === 3)
    return (
      <span className="w-10 text-center text-xs font-black px-1.5 py-0.5 rounded bg-amber-700/20 text-amber-600 border border-amber-700/30 shrink-0">
        P3
      </span>
    );
  return (
    <span className="w-10 text-center text-xs font-bold shrink-0 text-muted-foreground">
      P{pos}
    </span>
  );
}

function RaceRow({ slug, race, result }: { slug: string } & RaceResultEntry) {
  const isFinished = result.status === "Finished" || /^\+/.test(result.status) || result.status === "";
  const isDNS = result.status === "Did not start" || result.status === "DNS";
  const isDNF = !isFinished;

  return (
    <Link
      href={`/${slug}/races/${race.round}?year=${race.raceYear}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border text-sm hover:bg-accent/50 transition-colors"
    >
      {positionBadge(result.position, result.status)}
      <span className="flex-1 truncate">{race.name}</span>
      {isDNF ? (
        <span className="text-xs shrink-0 text-red-400 font-semibold">{isDNS ? "DNS" : "DNF"}</span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          {(result.gap ?? result.time) && (
            <span className="text-xs text-foreground">{result.gap ?? result.time}</span>
          )}
          {result.points > 0 && <span className="text-xs font-bold text-foreground">+{result.points}p</span>}
        </div>
      )}
    </Link>
  );
}

function YearGroup({
  slug,
  year,
  entries,
  defaultExpanded,
  raceCountLabel,
}: {
  slug: string;
  year: number;
  entries: RaceResultEntry[];
  defaultExpanded: boolean;
  raceCountLabel: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
      >
        <span className="font-mono text-sm font-bold tabular-nums">{year}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {raceCountLabel}
          <ChevronDown
            className={cn("w-4 h-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </span>
      </button>
      {expanded && (
        <div className="p-2 pt-0 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {entries.map(({ race, result }) => (
            <RaceRow key={`${race.raceYear}-${race.round}`} slug={slug} race={race} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DriverRaceResultsSection({ slug, raceResults }: Props) {
  const t = useTranslations("driversPage");

  if (raceResults.length === 0) return null;

  const byYear = new Map<number, RaceResultEntry[]>();
  for (const entry of raceResults) {
    const list = byYear.get(entry.race.raceYear) ?? [];
    list.push(entry);
    byYear.set(entry.race.raceYear, list);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <section className="space-y-2">
      <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
        {t("raceResults")}
      </h2>
      <div className="space-y-2">
        {years.map((year, i) => (
          <YearGroup
            key={year}
            slug={slug}
            year={year}
            entries={byYear.get(year)!}
            defaultExpanded={i === 0}
            raceCountLabel={t("raceCount", { count: byYear.get(year)!.length })}
          />
        ))}
      </div>
    </section>
  );
}
