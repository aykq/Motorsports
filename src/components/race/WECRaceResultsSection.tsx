"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, ChevronDown, ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaceResult, Standing } from "@/types/series";

interface Props {
  results: RaceResult[];
  slug: string;
  driverStandingsAfter?: Standing[];
  teamStandingsAfter?: Standing[];
  labels: {
    results: string;
    championship: string;
    driverChampionship: string;
    teamChampionship: string;
    loadMore?: string;
    viewAll?: string;
  };
}

const CLASS_ORDER = ["HYPERCAR", "LMP2", "LMGT3"];
const PAGE_SIZE = 5;

function classOrder(cls: string): number {
  const i = CLASS_ORDER.indexOf(cls?.toUpperCase());
  return i === -1 ? 99 : i;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function PositionBadge({ pos }: { pos: number }) {
  return (
    <span
      className={cn(
        "w-6 text-center font-bold tabular-nums shrink-0 text-base",
        pos === 1 && "text-yellow-500",
        pos === 2 && "text-zinc-400",
        pos === 3 && "text-amber-600",
        pos > 3 && "text-muted-foreground"
      )}
    >
      {pos}
    </span>
  );
}

function CarNumber({ num }: { num?: number | string }) {
  if (!num) return null;
  return (
    <span className="text-[11px] font-bold tabular-nums text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0 min-w-[2rem] text-center leading-none">
      #{num}
    </span>
  );
}

function ClassDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-muted/20 border-y border-border/60">
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function StandingRow({ standing, rank }: { standing: Standing; rank: number }) {
  const name = standing.driver
    ? `${standing.driver.firstName} ${standing.driver.lastName}`
    : (standing.team?.name ?? "—");
  const sub = standing.driver?.team ?? standing.team?.nationality;

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs border-b border-border last:border-0">
      <span
        className={cn(
          "w-5 text-center font-bold shrink-0",
          rank === 1 && "text-yellow-500",
          rank === 2 && "text-zinc-400",
          rank === 3 && "text-amber-600",
          rank > 3 && "text-muted-foreground"
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {sub && <p className="text-muted-foreground truncate">{sub}</p>}
      </div>
      <span className="font-bold shrink-0">{standing.points}</span>
    </div>
  );
}

function ClassResultGroup({
  cls,
  classResults,
  slug,
  hasClasses,
  loadMoreLabel,
  viewAllLabel,
}: {
  cls: string;
  classResults: RaceResult[];
  slug: string;
  hasClasses: boolean;
  loadMoreLabel: string;
  viewAllLabel: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = classResults.slice(0, visibleCount);
  const remaining = classResults.length - visibleCount;
  const hasMore = remaining > 0;

  return (
    <div>
      {hasClasses && cls && <ClassDivider label={cls} />}

      <div className="divide-y divide-border">
        {visible.map((result, i) => {
          const allDrivers = [result.driverName, ...(result.coDrivers ?? [])];
          const isDNF = result.status === "DNF";
          const isFirst = result.position === 1;
          const displayTime = isFirst
            ? (result.time ?? `${result.laps} laps`)
            : (result.gap ?? (isDNF ? "DNF" : result.status));
          const teamHref = result.teamId
            ? `/${slug}/teams/${result.teamId}`
            : `/${slug}/teams/${slugify(result.team)}`;

          return (
            <Link
              key={result.position}
              href={teamHref}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/40 transition-colors cursor-pointer",
                "animate-in fade-in slide-in-from-bottom-1 duration-200",
                isDNF && "opacity-60"
              )}
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
            >
              <PositionBadge pos={result.position} />
              <CarNumber num={result.driverNumber} />

              {/* Team + Drivers */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug truncate">
                  {result.team}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                  {allDrivers.join(" · ")}
                </p>
              </div>

              {/* Points + Time */}
              <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                {result.points > 0 && (
                  <span className="text-xs font-bold">{result.points}</span>
                )}
                {result.laps !== undefined && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {result.laps}L
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isDNF ? "text-red-400" : "text-foreground"
                  )}
                >
                  {displayTime}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex border-t border-border">
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, classResults.length))}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors border-r border-border"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {loadMoreLabel} ({Math.min(remaining, PAGE_SIZE)})
          </button>
          <button
            onClick={() => setVisibleCount(classResults.length)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            {viewAllLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function WECRaceResultsSection({
  results,
  slug,
  driverStandingsAfter = [],
  teamStandingsAfter = [],
  labels,
}: Props) {
  if (!results.length) return null;

  const grouped = new Map<string, RaceResult[]>();
  for (const r of results) {
    const cls = r.carClass?.toUpperCase() ?? "";
    if (!grouped.has(cls)) grouped.set(cls, []);
    grouped.get(cls)!.push(r);
  }

  const hasClasses = grouped.size > 1 || (grouped.size === 1 && [...grouped.keys()][0] !== "");
  const sortedClasses = [...grouped.keys()].sort((a, b) => classOrder(a) - classOrder(b));
  const loadMoreLabel = labels.loadMore ?? "5 daha göster";
  const viewAllLabel = labels.viewAll ?? "Tümünü gör";

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">
          {labels.results}
        </h2>

        <div className="rounded-lg border border-border overflow-hidden">
          {sortedClasses.map((cls, ci) => (
            <ClassResultGroup
              key={cls || ci}
              cls={cls}
              classResults={grouped.get(cls)!}
              slug={slug}
              hasClasses={hasClasses}
              loadMoreLabel={loadMoreLabel}
              viewAllLabel={viewAllLabel}
            />
          ))}
        </div>
      </section>

      {(driverStandingsAfter.length > 0 || teamStandingsAfter.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">
            {labels.championship}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {driverStandingsAfter.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>{labels.driverChampionship}</span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  {driverStandingsAfter.slice(0, 10).map((s) => (
                    <StandingRow key={s.position} standing={s} rank={s.position} />
                  ))}
                </div>
              </div>
            )}
            {teamStandingsAfter.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>{labels.teamChampionship}</span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  {teamStandingsAfter.slice(0, 10).map((s) => (
                    <StandingRow key={s.position} standing={s} rank={s.position} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
