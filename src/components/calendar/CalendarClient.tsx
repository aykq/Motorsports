"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/race/Countdown";
import { RaceCard } from "@/components/race/RaceCard";
import { Badge } from "@/components/ui/badge";
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

function groupByMonth(races: CalendarRace[]): Array<[string, CalendarRace[]]> {
  const map = new Map<string, CalendarRace[]>();
  for (const race of races) {
    const d = getRaceDate(race);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(race);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isCurrentOrFutureMonth(key: string): boolean {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return key >= currentKey;
}

function statusBadge(status: RaceStatus) {
  if (status === "live")
    return <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white border-0 animate-pulse">CANLI</Badge>;
  if (status === "completed")
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tamamlandı</Badge>;
  if (status === "cancelled")
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">İptal</Badge>;
  return null;
}

export function CalendarClient({ races, seriesCountdowns, availableSeries }: Props) {
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  function toggleSeries(slug: string) {
    setSelectedSeries((prev) => {
      if (prev.includes(slug)) {
        const next = prev.filter((s) => s !== slug);
        return next;
      }
      return [...prev, slug];
    });
  }

  const isAllSelected = selectedSeries.length === 0;

  // subSlug -> parentSlug  (e.g. moto2 -> motogp)
  const subToParent = new Map<string, string>();
  for (const s of availableSeries) {
    s.subSeries?.forEach((sub) => subToParent.set(sub, s.slug));
  }

  // build a flat set of slugs to include, expanding subSeries for each selected series
  const expandedSlugs = new Set<string>();
  for (const slug of selectedSeries) {
    expandedSlugs.add(slug);
    const config = availableSeries.find((s) => s.slug === slug);
    config?.subSeries?.forEach((sub) => expandedSlugs.add(sub));
  }

  const allFilteredRaces = isAllSelected
    ? races
    : races.filter((r) => expandedSlugs.has(r.seriesSlug));

  // always collapse sub-series races into their parent's row
  const primaryRaces = allFilteredRaces.filter((r) => !subToParent.has(r.seriesSlug));

  // circuitId -> sub-series races for that event
  const subRacesLookup = new Map<string, CalendarRace[]>();
  for (const race of allFilteredRaces) {
    if (subToParent.has(race.seriesSlug)) {
      if (!subRacesLookup.has(race.circuitId)) subRacesLookup.set(race.circuitId, []);
      const existing = subRacesLookup.get(race.circuitId)!;
      // one entry per seriesSlug per circuit to avoid duplicate keys
      if (!existing.some((r) => r.seriesSlug === race.seriesSlug)) {
        existing.push(race);
      }
    }
  }

  const filteredRaces = primaryRaces;

  const upcomingFiltered = filteredRaces
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const nextRace = upcomingFiltered[0] ?? null;

  const grouped = groupByMonth(
    filteredRaces.sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime())
  );

  // Bir ayı "gelecek" saymak için o ayda en az 1 upcoming/live yarış olmalı.
  // Sadece aya bakmak, bu ayın tamamlanan yarışlarını da yukarıda gösteriyor.
  const monthsWithUpcoming = new Set(
    filteredRaces
      .filter((r) => r.status === "upcoming" || r.status === "live")
      .map((r) => {
        const d = getRaceDate(r);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
  );

  const upcomingGroups = grouped.filter(([key]) => monthsWithUpcoming.has(key));
  const pastGroups = grouped.filter(([key]) => !monthsWithUpcoming.has(key)).reverse();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Takvim</h1>
        <p className="text-sm text-muted-foreground">{new Date().getFullYear()} Sezonu</p>
      </div>

      {/* ── Series Filter Chips ── */}
      {availableSeries.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSeries([])}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              isAllSelected
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Tümü
          </button>
          {availableSeries.map((s) => {
            const active = selectedSeries.includes(s.slug);
            return (
              <button
                key={s.slug}
                onClick={() => toggleSeries(s.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  active
                    ? "text-white border-transparent"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
                style={active ? { backgroundColor: s.color, borderColor: s.color } : undefined}
              >
                {s.shortName}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Countdown Section ── */}
      {isAllSelected ? (
        /* Per-series countdowns */
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
                    className="text-xs font-black px-2 py-0.5 rounded shrink-0"
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
        /* Single countdown for filtered series */
        <Link
          href={`/${nextRace.seriesSlug}/races/${nextRace.round}`}
          className="block rounded-xl bg-card border border-border p-6 space-y-4 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-black px-2 py-0.5 rounded"
              style={{ backgroundColor: `${nextRace.seriesColor}25`, color: nextRace.seriesColor }}
            >
              {nextRace.seriesShortName}
            </span>
            <span className="text-sm font-semibold truncate">{nextRace.name}</span>
          </div>
          <Countdown
            targetDate={getRaceDate(nextRace).toISOString()}
            label="Sıradaki Yarışa"
          />
          <div className="text-xs text-muted-foreground">
            {nextRace.circuitName} · {nextRace.location}, {nextRace.country}
          </div>
        </Link>
      ) : (
        <div className="rounded-xl bg-card border border-border p-6 text-center text-muted-foreground">
          <p className="text-sm">Yaklaşan yarış bulunamadı.</p>
        </div>
      )}

      {/* ── Upcoming Race Groups ── */}
      {upcomingGroups.map(([key, monthRaces]) => (
        <section key={key} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {monthLabel(key)}
          </h2>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
            {monthRaces.map((race) => (
              <RaceRow
                key={`${race.seriesSlug}-${race.round}`}
                race={race}
                past={race.status === "completed" || race.status === "cancelled"}
                subRaces={subRacesLookup.get(race.circuitId)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* ── Past Races ── */}
      {pastGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Geçmiş
          </h2>
          {pastGroups.map(([key, monthRaces]) => (
            <div key={key} className="space-y-2">
              <p className="text-xs text-muted-foreground/60 pl-1">{monthLabel(key)}</p>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
                {monthRaces.map((race) => (
                  <RaceRow
                    key={`${race.seriesSlug}-${race.round}`}
                    race={race}
                    past={true}
                    subRaces={subRacesLookup.get(race.circuitId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {filteredRaces.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Bu seri için henüz veri yok.</p>
        </div>
      )}
    </div>
  );
}

function RaceRow({ race, past = false, subRaces }: { race: CalendarRace; past?: boolean; subRaces?: CalendarRace[] }) {
  const raceDate = getRaceDate(race);
  const href = `/${race.seriesSlug}/races/${race.round}`;

  const dateStr = raceDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

  const timeStr = raceDate.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const hasTime = timeStr !== "00:00" && timeStr !== "03:00";

  const isCancelled = race.status === "cancelled";

  // İptal yarışlar tıklanamaz — detail sayfasında gösterilecek veri yok
  const Wrapper = isCancelled
    ? ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    : ({ children }: { children: React.ReactNode }) => <Link href={href}>{children}</Link>;

  return (
    <Wrapper>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-3 text-sm transition-colors",
          !isCancelled && "hover:bg-accent/50 cursor-pointer",
          (past || isCancelled) && "opacity-50"
        )}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: isCancelled ? "var(--muted-foreground)" : race.seriesColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium truncate">{race.name}</p>
            {subRaces?.map((sr) => (
              <span
                key={`${sr.seriesSlug}-${sr.round}`}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ backgroundColor: `${sr.seriesColor}22`, color: sr.seriesColor }}
              >
                {sr.seriesShortName}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {race.seriesShortName} · {race.circuitName}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {dateStr}{hasTime && <span className="ml-1.5 text-muted-foreground/70">{timeStr}</span>}
          </p>
          {statusBadge(race.status)}
        </div>
      </div>
    </Wrapper>
  );
}
