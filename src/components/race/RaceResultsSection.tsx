import Link from "next/link";
import { Zap, Trophy, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TireStints } from "@/components/race/TireStints";
import { RaceControlSection } from "@/components/race/RaceControlSection";
import type { RaceResult, Standing, TireStint, RaceControlEvent } from "@/types/series";

export interface RaceLabels {
  results: string;
  tireStints: string;
  championship: string;
  driverChampionship: string;
  teamChampionship: string;
  colPos: string;
  colDriverTeam: string;
  colPoints: string;
  colTimeStatus: string;
}

interface Props {
  results: RaceResult[];
  tireStints: TireStint[];
  raceControl: RaceControlEvent[];
  raceControlTr: string[];
  driverStandingsAfter: Standing[];
  teamStandingsAfter: Standing[];
  labels: RaceLabels;
  slug: string;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
      {title}
    </h2>
  );
}

function GridChange({ grid, position }: { grid?: number; position: number }) {
  if (!grid) return null;
  const diff = grid - position;
  if (diff === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-green-500 text-[10px] font-medium">
        <ChevronUp className="w-3 h-3" />{diff}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-500 text-[10px] font-medium">
      <ChevronDown className="w-3 h-3" />{Math.abs(diff)}
    </span>
  );
}

function PositionBadge({ position }: { position: number }) {
  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 self-center mx-auto",
        position === 1 && "bg-yellow-500/15 text-yellow-500",
        position === 2 && "bg-zinc-500/15 text-zinc-400",
        position === 3 && "bg-amber-700/15 text-amber-600",
        position > 3 && "text-muted-foreground"
      )}
    >
      {position}
    </div>
  );
}

function CompactResultRow({ result, slug }: { result: RaceResult; slug: string }) {
  const { status } = result;
  const isLapped = status.startsWith("+") && status.toLowerCase().includes("lap");
  const isDNS = status === "Did Not Start" || status === "Withdrew";
  const isDNF = status !== "Finished" && !isLapped && !isDNS;
  const isOut = isDNF || isDNS;
  const displayName = result.driverCode ?? result.driverName.split(" ").pop()!;
  const displayTime = result.gap ?? (isDNS ? "DNS" : status);

  return (
    <div className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-1 text-xs px-2 py-2 hover:bg-accent/30 transition-colors">
      <span className="text-center font-mono font-bold shrink-0 text-muted-foreground text-[11px]">
        {result.position}
      </span>
      <div className="px-1 min-w-0">
        <Link
          href={`/${slug}/drivers/${result.driverId}`}
          className="font-medium truncate block hover:underline cursor-pointer leading-snug"
        >
          {displayName}
        </Link>
        <span className="text-[10px] text-muted-foreground truncate block leading-snug">
          {result.team}
        </span>
      </div>
      <span
        className={cn(
          "text-right font-mono text-xs shrink-0 pl-2",
          isOut ? "text-red-400 font-medium" : "text-muted-foreground"
        )}
      >
        {displayTime}
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
    <div className={cn(
      "flex items-center gap-3 px-3 py-1.5 text-xs border-b border-border last:border-0 hover:bg-accent/30 transition-colors",
      rank === 1 && "bg-yellow-500/5"
    )}>
      <span
        className={cn(
          "w-5 text-right font-mono font-bold shrink-0",
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
        {sub && <p className="text-muted-foreground truncate text-[10px]">{sub}</p>}
      </div>
      <span className="font-display text-sm font-bold shrink-0">{standing.points}</span>
      {standing.wins > 0 && (
        <span className="text-muted-foreground shrink-0 text-[10px]">{standing.wins}W</span>
      )}
    </div>
  );
}

export function RaceResultsSection({
  results,
  tireStints,
  raceControl,
  raceControlTr,
  driverStandingsAfter,
  teamStandingsAfter,
  labels,
  slug,
}: Props) {
  if (!results.length) return null;

  const fastestLapHolder = results.find((r) => r.fastestLap);
  const topResults = results.filter((r) => r.position <= 10);
  const nonPoints = results.filter((r) => r.position > 10);
  const npHalf = Math.ceil(nonPoints.length / 2);

  return (
    <div className="space-y-6">
      {/* Race Results Table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionHeader title={labels.results} />
          {fastestLapHolder && (
            <div className="flex items-center gap-1 text-xs text-purple-400">
              <Zap className="w-3 h-3" />
              <span>
                {fastestLapHolder.driverCode ?? fastestLapHolder.driverName.split(" ").pop()}
                {fastestLapHolder.fastestLapTime && (
                  <span className="text-muted-foreground ml-1">
                    ({fastestLapHolder.fastestLapTime})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1rem_1fr_2.5rem_6rem] font-display text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border bg-muted/30 gap-2">
            <span className="text-center">{labels.colPos}</span>
            <span />
            <span className="ml-1">{labels.colDriverTeam}</span>
            <span className="text-right">{labels.colPoints}</span>
            <span className="text-right">{labels.colTimeStatus}</span>
          </div>

          {/* Top 10 rows */}
          <div className="divide-y divide-border">
            {topResults.map((result, index) => {
              const isFinished = result.status === "Finished" || result.status.startsWith("+");
              const isDNS = result.status === "Did Not Start" || result.status === "Withdrew";
              const isDNF = !isFinished && !isDNS;
              const isOut = isDNF || isDNS;
              const displayTime =
                result.position === 1
                  ? (result.time ?? "—")
                  : (result.gap ?? (isFinished ? "—" : result.status));

              return (
                <div
                  key={result.position}
                  className={cn(
                    "grid grid-cols-[2rem_1rem_1fr_2.5rem_6rem] text-xs px-3 py-2.5 hover:bg-accent/30 transition-colors gap-2 animate-in fade-in slide-in-from-left-1 duration-300",
                    "border-l-4",
                    result.position === 1 && "border-l-yellow-500/50",
                    result.position === 2 && "border-l-zinc-400/40",
                    result.position === 3 && "border-l-amber-600/40",
                    result.position > 3 && "border-l-transparent",
                    result.fastestLap && "bg-purple-500/[0.04]",
                    isOut && "opacity-50",
                  )}
                  style={{ animationDelay: `${index * 25}ms` }}
                >
                  <PositionBadge position={result.position} />
                  <div className="self-center">
                    <GridChange grid={result.gridPosition} position={result.position} />
                  </div>
                  <div className="ml-1 min-w-0 self-center">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/${slug}/drivers/${result.driverId}`}
                        className="font-medium truncate hover:underline cursor-pointer"
                      >
                        {result.driverName}
                      </Link>
                      {result.fastestLap && <Zap className="w-3 h-3 text-purple-400 shrink-0" />}
                    </div>
                    <span className="text-muted-foreground truncate block">{result.team}</span>
                  </div>
                  <span className="text-right self-center font-mono font-medium shrink-0">
                    {result.points > 0 ? result.points : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-right self-center shrink-0 font-mono",
                      isOut ? "text-red-400" : "text-foreground"
                    )}
                  >
                    {displayTime}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Non-points compact section — 2 columns */}
          {nonPoints.length > 0 && (
            <div className="border-t border-dashed border-border">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="divide-y divide-border">
                  {nonPoints.slice(0, npHalf).map((r) => (
                    <CompactResultRow key={r.position} result={r} slug={slug} />
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {nonPoints.slice(npHalf).map((r) => (
                    <CompactResultRow key={r.position} result={r} slug={slug} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tire Stints */}
      {tireStints.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title={labels.tireStints} />
          <div className="rounded-lg border border-border p-3">
            <TireStints stints={tireStints} results={results} />
          </div>
        </section>
      )}

      {/* Race Events */}
      {raceControl.length > 0 && (
        <RaceControlSection events={raceControl} eventsTr={raceControlTr} />
      )}

      {/* Championship Standings */}
      {driverStandingsAfter.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title={labels.championship} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
