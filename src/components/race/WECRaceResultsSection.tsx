import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaceResult, Standing } from "@/types/series";

interface Props {
  results: RaceResult[];
  driverStandingsAfter?: Standing[];
  teamStandingsAfter?: Standing[];
  labels: {
    results: string;
    championship: string;
    driverChampionship: string;
    teamChampionship: string;
  };
}

const CLASS_ORDER = ["HYPERCAR", "LMP2", "LMGT3"];

function classOrder(cls: string): number {
  const i = CLASS_ORDER.indexOf(cls?.toUpperCase());
  return i === -1 ? 99 : i;
}

function PositionBadge({ pos }: { pos: number }) {
  return (
    <span
      className={cn(
        "w-6 text-right font-bold tabular-nums shrink-0 text-base",
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
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border-y border-border/60">
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
          "w-5 text-right font-bold shrink-0",
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

export function WECRaceResultsSection({
  results,
  driverStandingsAfter = [],
  teamStandingsAfter = [],
  labels,
}: Props) {
  if (!results.length) return null;

  // Group by class, preserving order
  const grouped = new Map<string, RaceResult[]>();
  for (const r of results) {
    const cls = r.carClass?.toUpperCase() ?? "";
    if (!grouped.has(cls)) grouped.set(cls, []);
    grouped.get(cls)!.push(r);
  }

  const hasClasses = grouped.size > 1 || (grouped.size === 1 && [...grouped.keys()][0] !== "");

  // Sort classes by canonical order
  const sortedClasses = [...grouped.keys()].sort(
    (a, b) => classOrder(a) - classOrder(b)
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {labels.results}
        </h2>

        <div className="rounded-lg border border-border overflow-hidden">
          {sortedClasses.map((cls, ci) => {
            const classResults = grouped.get(cls)!;

            return (
              <div key={cls || ci}>
                {hasClasses && cls && <ClassDivider label={cls} />}

                <div className="divide-y divide-border">
                  {classResults.map((result) => {
                    const allDrivers = [result.driverName, ...(result.coDrivers ?? [])];
                    const isDNF = result.status === "DNF";
                    const isFirst = result.position === 1;
                    const displayTime = isFirst
                      ? (result.time ?? `${result.laps} laps`)
                      : (result.gap ?? (isDNF ? "DNF" : result.status));

                    return (
                      <div
                        key={result.position}
                        className={cn(
                          "flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/30 transition-colors",
                          isDNF && "opacity-60"
                        )}
                      >
                        <PositionBadge pos={result.position} />

                        <CarNumber num={result.driverNumber} />

                        {/* Team + Drivers */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug truncate">
                            {result.team}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                            {allDrivers.join(" · ")}
                          </p>
                        </div>

                        {/* Points + Time */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Championship Standings */}
      {(driverStandingsAfter.length > 0 || teamStandingsAfter.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {labels.championship}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {driverStandingsAfter.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
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
