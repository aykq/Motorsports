import Link from "next/link";
import { cn, toTitleCase } from "@/lib/utils";
import type { Race, RaceStatus } from "@/types/series";
import type { SeriesConfig } from "@/lib/series-config";

interface RaceTimelineProps {
  races: Race[];
  series: SeriesConfig;
  subSeriesMap: Map<string, Map<string, Race>>;
  subConfigs: SeriesConfig[];
  locale: string;
  nowLabel: string;
  statusLabels: Record<RaceStatus, string> & { next: string };
}

type TimelineItem =
  | { kind: "race"; race: Race; isNext: boolean }
  | { kind: "now-marker" };

function getRaceDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

function buildTimelineItems(races: Race[]): TimelineItem[] {
  const upcoming = races
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const past = races
    .filter((r) => r.status === "completed" || r.status === "cancelled")
    .sort((a, b) => getRaceDate(b).getTime() - getRaceDate(a).getTime());

  const items: TimelineItem[] = [];

  upcoming.forEach((race, i) => {
    items.push({ kind: "race", race, isNext: i === 0 });
  });

  if (upcoming.length > 0 && past.length > 0) {
    items.push({ kind: "now-marker" });
  }

  past.forEach((race) => {
    items.push({ kind: "race", race, isNext: false });
  });

  return items;
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

interface DotIconProps {
  status: RaceStatus;
  isNext: boolean;
  color: string;
}

function DotIcon({ status, isNext, color }: DotIconProps) {
  if (status === "live") {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-rose-500/30 shrink-0" />
    );
  }
  if (status === "cancelled") {
    return (
      <span className="relative w-2 h-2 shrink-0 flex items-center justify-center">
        <span className="absolute w-full h-px bg-muted-foreground/50 rotate-45" />
        <span className="absolute w-full h-px bg-muted-foreground/50 -rotate-45" />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="w-2 h-2 rounded-full bg-muted-foreground/60 shrink-0" />;
  }
  if (isNext) {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
        style={{ borderColor: color, backgroundColor: `${color}20` }}
      />
    );
  }
  return <span className="w-2 h-2 rounded-full shrink-0 border border-border bg-transparent" />;
}

interface RaceRowProps {
  race: Race;
  series: SeriesConfig;
  isNext: boolean;
  locale: string;
  statusLabels: Record<RaceStatus, string> & { next: string };
}

function RaceRow({ race, series, isNext, locale, statusLabels }: RaceRowProps) {
  const date = getRaceDate(race);
  const isCancelled = race.status === "cancelled";
  const isLive = race.status === "live";
  const isCompleted = race.status === "completed";

  const statusLabel = isNext ? statusLabels.next : statusLabels[race.status];

  const inner = (
    <div
      className={cn(
        "flex-1 min-w-0 flex items-start justify-between gap-2 rounded-lg px-2 py-1.5",
        !isCancelled && "hover:bg-accent/40 transition-colors",
        isCancelled && "opacity-50"
      )}
      style={
        isNext
          ? {
              outline: `1px solid ${series.color}50`,
              backgroundColor: `${series.color}08`,
            }
          : undefined
      }
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            R{race.round}
          </span>
          <span className="text-sm font-semibold leading-tight truncate">
            {toTitleCase(race.name)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {race.circuitName} · <span className="font-mono">{formatDate(date, locale)}</span>
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-display text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap mt-1",
          isCompleted && "text-muted-foreground",
          isCancelled && "text-muted-foreground/60",
          isLive && "text-rose-500"
        )}
        style={isNext ? { color: series.color } : undefined}
      >
        {statusLabel}
      </span>
    </div>
  );

  if (isCancelled) {
    return <div className="flex-1 min-w-0">{inner}</div>;
  }

  return (
    <Link href={`/${series.slug}/races/${race.round}`} className="flex-1 min-w-0">
      {inner}
    </Link>
  );
}

interface SubSeriesChipsProps {
  circuitId: string;
  subSeriesMap: Map<string, Map<string, Race>>;
  subConfigs: SeriesConfig[];
}

function SubSeriesChips({ circuitId, subSeriesMap, subConfigs }: SubSeriesChipsProps) {
  const eventSubSeries = subSeriesMap.get(circuitId);
  if (!eventSubSeries || eventSubSeries.size === 0) return null;

  return (
    <div className="flex gap-2 pl-1 pb-1">
      {subConfigs.map((subConfig) => {
        const subRace = eventSubSeries.get(subConfig.slug);
        if (!subRace) return null;
        return (
          <Link
            key={subConfig.slug}
            href={`/${subConfig.slug}/races/${subRace.round}`}
            className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition-colors hover:opacity-80"
            style={{
              borderColor: `${subConfig.color}40`,
              color: subConfig.color,
              backgroundColor: `${subConfig.color}10`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: subConfig.color }}
            />
            {subConfig.shortName}
          </Link>
        );
      })}
    </div>
  );
}

export function RaceTimeline({
  races,
  series,
  subSeriesMap,
  subConfigs,
  locale,
  nowLabel,
  statusLabels,
}: RaceTimelineProps) {
  const items = buildTimelineItems(races);
  const hasSubSeries = subConfigs.length > 0;

  const lastRaceIndex = (() => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].kind === "race") return i;
    }
    return -1;
  })();

  return (
    <ol className="relative">
      {items.map((item, index) => {
        if (item.kind === "now-marker") {
          return (
            <li key="now-marker" className="flex items-center gap-3 my-3 px-2">
              <div className="flex-1 h-px bg-border" />
              <span className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                {nowLabel}
              </span>
              <div className="flex-1 h-px bg-border" />
            </li>
          );
        }

        const { race, isNext } = item;
        const isLast = index === lastRaceIndex;

        return (
          <li key={race.round} className="flex items-stretch gap-0">
            <div className="flex flex-col items-center w-5 shrink-0 pt-[11px]">
              <DotIcon status={race.status} isNext={isNext} color={series.color} />
              {!isLast && (
                <div className="w-px flex-1 min-h-[20px] bg-border mt-1.5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <RaceRow
                race={race}
                series={series}
                isNext={isNext}
                locale={locale}
                statusLabels={statusLabels}
              />
              {hasSubSeries && (
                <SubSeriesChips
                  circuitId={race.circuitId}
                  subSeriesMap={subSeriesMap}
                  subConfigs={subConfigs}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
