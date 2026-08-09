import { getCachedSchedule, getCachedStandings, getCachedDrivers } from "@/lib/cache";
import { SERIES_LIST, isSeriesVisible } from "@/lib/series-config";
import { getShowNonF1Series } from "@/lib/app-settings";
import { getF1CircuitPhotoUrl, getF1CircuitCoords } from "@/lib/circuit-data";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { getNextRace, getLastCompletedRace, getTopDriversWithPoints } from "@/lib/home-hub";
import { formatRaceWeekend } from "@/components/series/NextRaceHeroCard";
import { SeriesHubWidgets } from "@/components/calendar/SeriesHubWidgets";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { CalendarRace, SeriesCountdownInfo } from "@/components/calendar/CalendarClient";
import type { StandingsRow } from "@/components/series/StandingsTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Takvim" };

function getRaceSessionDate(race: { sessions: { type: string; date: string }[]; date: string }): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

export default async function CalendarPage() {
  const year = new Date().getFullYear();
  const showNonF1Series = await getShowNonF1Series();
  const allAvailableSeries = SERIES_LIST.filter(
    (s) => s.available && isSeriesVisible(s, showNonF1Series)
  );
  // filter bar + countdown chips — hidden sub-series (moto2/moto3) excluded
  const filterSeries = allAvailableSeries.filter((s) => !s.hidden);

  const allRacesNested = await Promise.all(
    allAvailableSeries.map(async (series) => {
      const { races } = await getCachedSchedule(series.slug, year);
      return races.map((r): CalendarRace => ({
        ...r,
        seriesSlug: series.slug,
        seriesName: series.name,
        seriesShortName: series.shortName,
        seriesColor: series.color,
      }));
    })
  );

  const allRaces = allRacesNested.flat();

  const seriesCountdowns: SeriesCountdownInfo[] = filterSeries.map((series) => {
    const seriesRaces = allRacesNested[allAvailableSeries.indexOf(series)] ?? [];
    const next = seriesRaces
      .filter((r) => r.status === "upcoming" || r.status === "live")
      .sort((a, b) => getRaceSessionDate(a).getTime() - getRaceSessionDate(b).getTime())[0] ?? null;

    return {
      slug: series.slug,
      name: series.name,
      shortName: series.shortName,
      color: series.color,
      nextRaceDate: next ? getRaceSessionDate(next).toISOString() : null,
      nextRaceName: next?.name ?? null,
      nextRaceHref: next ? `/${series.slug}/races/${next.round}` : null,
      nextRaceCircuitId: next?.circuitId ?? null,
      series,
    };
  });

  let seriesHub: React.ReactNode = null;

  if (allAvailableSeries.length === 1) {
    const series = allAvailableSeries[0];
    const seriesRaces = allRacesNested[0] ?? [];

    const [tSeries, tCalendar, tPoints, locale, { standings: driverStandings }, { standings: teamStandings }, { drivers }] = await Promise.all([
      getTranslations("seriesPage"),
      getTranslations("calendar"),
      getTranslations("standingsPage"),
      getLocale(),
      getCachedStandings(series.slug, year, "driver"),
      getCachedStandings(series.slug, year, "team"),
      getCachedDrivers(series.slug),
    ]);

    const nextRace = getNextRace(seriesRaces);
    const lastRace = getLastCompletedRace(seriesRaces);
    const topDrivers = getTopDriversWithPoints(driverStandings, drivers, 5);

    const teamStandingsRows: StandingsRow[] = teamStandings.slice(0, 5).map((s) => {
      const f1Team = series.slug === "f1"
        ? (getF1Team(s.team?.id) ?? getF1TeamByName(s.team?.name))
        : undefined;
      return {
        position: s.position,
        name: f1Team?.fullName ?? s.team?.name ?? "—",
        sub: "",
        href: s.team?.id ? `/${series.slug}/teams/${s.team.id}` : "#",
        points: s.points,
      };
    });

    const circuitPhotoUrl = nextRace && series.slug === "f1" ? getF1CircuitPhotoUrl(nextRace.circuitId) : null;
    const circuitCoords = nextRace && series.slug === "f1"
      ? (getF1CircuitCoords(nextRace.circuitId) ?? (
          nextRace.circuitLat && nextRace.circuitLng
            ? [nextRace.circuitLat, nextRace.circuitLng] as [number, number]
            : null
        ))
      : null;

    seriesHub = (
      <SeriesHubWidgets
        slug={series.slug}
        color={series.color}
        nextRace={nextRace}
        circuitPhotoUrl={circuitPhotoUrl}
        circuitCoords={circuitCoords}
        lastRace={lastRace}
        topDrivers={topDrivers}
        teamStandingsRows={teamStandingsRows}
        labels={{
          nextRound: tSeries("nextRound"),
          viewDetails: tSeries("viewDetails"),
          schedule: tSeries("schedule"),
          weekend: nextRace ? formatRaceWeekend(nextRace, locale) : "",
          lastRaceTitle: tCalendar("lastRace"),
          driversTitle: tSeries("drivers"),
          teamsTitle: tSeries("teams"),
          viewAll: tSeries("viewAll"),
          pointsAbbr: tPoints("pointsAbbr"),
        }}
      />
    );
  }

  return (
    <CalendarClient
      races={allRaces}
      seriesCountdowns={seriesCountdowns}
      availableSeries={filterSeries}
      seriesHub={seriesHub}
    />
  );
}
