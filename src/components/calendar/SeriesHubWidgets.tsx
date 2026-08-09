import Link from "next/link";
import { NextRaceHeroCard } from "@/components/series/NextRaceHeroCard";
import { StandingsTable, type StandingsRow } from "@/components/series/StandingsTable";
import { LastRacePodium } from "@/components/calendar/LastRacePodium";
import { TopDriversStrip } from "@/components/calendar/TopDriversStrip";
import type { TopDriverEntry } from "@/lib/home-hub";
import type { Race } from "@/types/series";

export interface SeriesHubLabels {
  nextRound: string;
  viewDetails: string;
  schedule: string;
  weekend: string;
  lastRaceTitle: string;
  driversTitle: string;
  teamsTitle: string;
  viewAll: string;
  pointsAbbr: string;
}

export interface SeriesHubWidgetsProps {
  slug: string;
  color: string;
  nextRace: Race | null;
  circuitPhotoUrl: string | null;
  circuitCoords: [number, number] | null;
  lastRace: Race | null;
  topDrivers: TopDriverEntry[];
  teamStandingsRows: StandingsRow[];
  labels: SeriesHubLabels;
}

export function SeriesHubWidgets({
  slug,
  color,
  nextRace,
  circuitPhotoUrl,
  circuitCoords,
  lastRace,
  topDrivers,
  teamStandingsRows,
  labels,
}: SeriesHubWidgetsProps) {
  return (
    <div className="space-y-4">
      {nextRace && (
        <NextRaceHeroCard
          race={nextRace}
          slug={slug}
          color={color}
          circuitPhotoUrl={circuitPhotoUrl}
          circuitCoords={circuitCoords}
          weekendLabel={labels.weekend}
          nextRoundLabel={labels.nextRound}
          viewDetailsLabel={labels.viewDetails}
          scheduleLabel={labels.schedule}
        />
      )}

      {lastRace && (
        <LastRacePodium
          race={lastRace}
          slug={slug}
          color={color}
          title={labels.lastRaceTitle}
          pointsAbbr={labels.pointsAbbr}
        />
      )}

      {topDrivers.length > 0 && (
        <TopDriversStrip
          entries={topDrivers}
          slug={slug}
          color={color}
          title={labels.driversTitle}
          viewAllLabel={labels.viewAll}
          viewAllHref={`/${slug}/standings`}
          pointsAbbr={labels.pointsAbbr}
        />
      )}

      {teamStandingsRows.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">{labels.teamsTitle}</h3>
            <Link href={`/${slug}/standings`} className="text-xs hover:opacity-70 transition-opacity" style={{ color }}>
              {labels.viewAll}
            </Link>
          </div>
          <StandingsTable color={color} rows={teamStandingsRows} />
        </section>
      )}
    </div>
  );
}
