"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn, toTitleCase } from "@/lib/utils";
import { Countdown } from "@/components/race/Countdown";
import { useTranslations, useLocale } from "next-intl";
import type { RaceStatus } from "@/types/series";
import type { SeriesConfig } from "@/lib/series-config";
import type { Race } from "@/types/series";

export interface CalendarRace extends Race {
  seriesSlug: string;
  seriesName: string;
  seriesShortName: string;
  seriesColor: string;
}

export interface SeriesCountdownInfo {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  nextRaceDate: string | null;
  nextRaceName: string | null;
  nextRaceHref: string | null;
  series: SeriesConfig;
}

interface Props {
  races: CalendarRace[];
  seriesCountdowns: SeriesCountdownInfo[];
  availableSeries: SeriesConfig[];
}

function getRaceDate(race: CalendarRace): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

type TimelineItem =
  | { kind: "race"; race: CalendarRace; isNext: boolean }
  | { kind: "now-marker" };

function buildTimelineItems(races: CalendarRace[]): TimelineItem[] {
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

function CalendarDot({ race, isNext }: { race: CalendarRace; isNext: boolean }) {
  if (race.status === "live") {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-rose-500/30 shrink-0" />
    );
  }
  if (race.status === "cancelled") {
    return (
      <span className="relative w-2 h-2 shrink-0 flex items-center justify-center">
        <span className="absolute w-full h-px bg-muted-foreground/50 rotate-45" />
        <span className="absolute w-full h-px bg-muted-foreground/50 -rotate-45" />
      </span>
    );
  }
  if (race.status === "completed") {
    return (
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: `${race.seriesColor}90` }}
      />
    );
  }
  if (isNext) {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
        style={{ borderColor: race.seriesColor, backgroundColor: `${race.seriesColor}20` }}
      />
    );
  }
  return <span className="w-2 h-2 rounded-full shrink-0 border border-border bg-transparent" />;
}

function CalendarTimelineRow({
  race,
  isNext,
  subRaces,
  locale,
  statusLabels,
}: {
  race: CalendarRace;
  isNext: boolean;
  subRaces: CalendarRace[] | undefined;
  locale: string;
  statusLabels: Record<RaceStatus, string> & { next: string };
}) {
  const isCancelled = race.status === "cancelled";
  const isLive = race.status === "live";
  const isCompleted = race.status === "completed";
  const date = getRaceDate(race);
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
              outline: `1px solid ${race.seriesColor}50`,
              backgroundColor: `${race.seriesColor}08`,
            }
          : undefined
      }
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[11px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
            style={{ backgroundColor: `${race.seriesColor}22`, color: race.seriesColor }}
          >
            {race.seriesShortName}
          </span>
          <span className="text-sm font-semibold leading-tight truncate">{toTitleCase(race.name)}</span>
          {subRaces?.map((sr) => (
            <span
              key={`${sr.seriesSlug}-${sr.round}`}
              className="text-[11px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${sr.seriesColor}22`, color: sr.seriesColor }}
            >
              {sr.seriesShortName}
            </span>
          ))}
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
          isLive && "text-[var(--series)]"
        )}
        style={isNext ? { color: race.seriesColor } : undefined}
      >
        {statusLabel}
      </span>
    </div>
  );

  if (isCancelled) return <div className="flex-1 min-w-0">{inner}</div>;
  return (
    <Link href={`/${race.seriesSlug}/races/${race.round}`} className="flex-1 min-w-0">
      {inner}
    </Link>
  );
}

function CalendarTimeline({
  races,
  subRacesLookup,
  locale,
  nowLabel,
  statusLabels,
}: {
  races: CalendarRace[];
  subRacesLookup: Map<string, CalendarRace[]>;
  locale: string;
  nowLabel: string;
  statusLabels: Record<RaceStatus, string> & { next: string };
}) {
  const items = buildTimelineItems(races);

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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                {nowLabel}
              </span>
              <div className="flex-1 h-px bg-border" />
            </li>
          );
        }

        const { race, isNext } = item;
        const isLast = index === lastRaceIndex;
        const subRaces = subRacesLookup.get(race.circuitId);

        return (
          <li key={`${race.seriesSlug}-${race.round}`} className="flex items-stretch gap-0">
            <div className="flex flex-col items-center w-5 shrink-0 pt-[11px]">
              <CalendarDot race={race} isNext={isNext} />
              {!isLast && (
                <div className="w-px flex-1 min-h-[20px] bg-border mt-1.5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <CalendarTimelineRow
                race={race}
                isNext={isNext}
                subRaces={subRaces}
                locale={locale}
                statusLabels={statusLabels}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function CalendarClient({ races, seriesCountdowns, availableSeries }: Props) {
  const t = useTranslations("calendar");
  const raceStatusT = useTranslations("raceStatus");
  const locale = useLocale();
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  function toggleSeries(slug: string) {
    setSelectedSeries((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      return [...prev, slug];
    });
  }

  const isAllSelected = selectedSeries.length === 0;

  const subToParent = new Map<string, string>();
  for (const s of availableSeries) {
    s.subSeries?.forEach((sub) => subToParent.set(sub, s.slug));
  }

  const expandedSlugs = new Set<string>();
  for (const slug of selectedSeries) {
    expandedSlugs.add(slug);
    const config = availableSeries.find((s) => s.slug === slug);
    config?.subSeries?.forEach((sub) => expandedSlugs.add(sub));
  }

  const allFilteredRaces = isAllSelected
    ? races
    : races.filter((r) => expandedSlugs.has(r.seriesSlug));

  const primaryRaces = allFilteredRaces.filter((r) => !subToParent.has(r.seriesSlug));

  const subRacesLookup = new Map<string, CalendarRace[]>();
  for (const race of allFilteredRaces) {
    if (subToParent.has(race.seriesSlug)) {
      if (!subRacesLookup.has(race.circuitId)) subRacesLookup.set(race.circuitId, []);
      const existing = subRacesLookup.get(race.circuitId)!;
      if (!existing.some((r) => r.seriesSlug === race.seriesSlug)) {
        existing.push(race);
      }
    }
  }

  const upcomingFiltered = primaryRaces
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const nextRace = upcomingFiltered[0] ?? null;

  const statusLabels = {
    upcoming: raceStatusT("upcoming"),
    live: raceStatusT("live"),
    completed: raceStatusT("completed"),
    cancelled: raceStatusT("cancelled"),
    next: t("nextRace"),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-0.5">
        <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
        <p className="text-xs text-muted-foreground font-mono">{t("season", { year: new Date().getFullYear() })}</p>
      </div>

      {availableSeries.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSeries([])}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider border transition-colors",
              isAllSelected
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t("all")}
          </button>
          {availableSeries.map((s) => {
            const active = selectedSeries.includes(s.slug);
            return (
              <button
                key={s.slug}
                onClick={() => toggleSeries(s.slug)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider border transition-colors",
                  active
                    ? "text-white border-transparent"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
                style={active ? { backgroundColor: s.color, borderColor: s.color } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? "#fff" : s.color }} />
                {s.shortName}
              </button>
            );
          })}
        </div>
      )}

      {isAllSelected ? (
        <div className={cn(
          "grid gap-3",
          seriesCountdowns.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        )}>
          {seriesCountdowns.map((sc) => {
            if (!sc.nextRaceDate) return null;
            const CardWrapper = sc.nextRaceHref
              ? ({ children }: { children: React.ReactNode }) => (
                  <Link href={sc.nextRaceHref!} className="block rounded-xl bg-card border border-border p-4 space-y-3 hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderTopWidth: 2, borderTopColor: sc.color }}>
                    {children}
                  </Link>
                )
              : ({ children }: { children: React.ReactNode }) => (
                  <div className="rounded-xl bg-card border border-border p-4 space-y-3" style={{ borderTopWidth: 2, borderTopColor: sc.color }}>
                    {children}
                  </div>
                );
            return (
              <CardWrapper key={sc.slug}>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: `${sc.color}25`, color: sc.color }}
                  >
                    {sc.shortName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{sc.nextRaceName}</span>
                </div>
                <Countdown targetDate={sc.nextRaceDate} compact label="" />
              </CardWrapper>
            );
          })}
        </div>
      ) : nextRace ? (
        <Link
          href={`/${nextRace.seriesSlug}/races/${nextRace.round}`}
          className="group block relative overflow-hidden rounded-2xl border border-border p-6 transition-[border-color] hover:border-border/0"
          style={{ background: `linear-gradient(110deg, color-mix(in oklch, ${nextRace.seriesColor} 20%, var(--card)), var(--card) 52%)` }}
        >
          <span
            aria-hidden
            className="absolute -right-10 -top-8 -bottom-8 w-40 skew-x-[-18deg] opacity-15"
            style={{ background: `linear-gradient(180deg, ${nextRace.seriesColor}, transparent)` }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nextRace.seriesColor }} />
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: nextRace.seriesColor }}>
                {nextRace.seriesShortName} · {t("nextRace")}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{nextRace.name}</h2>
            <div className="text-xs text-muted-foreground font-mono">
              {nextRace.circuitName} · {nextRace.location}, {nextRace.country}
            </div>
            <Countdown targetDate={getRaceDate(nextRace).toISOString()} label="" />
          </div>
        </Link>
      ) : (
        <div className="rounded-xl bg-card border border-border p-6 text-center text-muted-foreground">
          <p className="text-sm">{t("noUpcoming")}</p>
        </div>
      )}

      {primaryRaces.length > 0 ? (
        <CalendarTimeline
          races={primaryRaces}
          subRacesLookup={subRacesLookup}
          locale={locale}
          nowLabel={t("completed")}
          statusLabels={statusLabels}
        />
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{t("noData")}</p>
        </div>
      )}
    </div>
  );
}
