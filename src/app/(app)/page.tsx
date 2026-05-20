import { getCachedSchedule } from "@/lib/cache";
import { SERIES_LIST } from "@/lib/series-config";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import type { Metadata } from "next";
import type { CalendarRace, SeriesCountdownInfo } from "@/components/calendar/CalendarClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Takvim" };

function getRaceSessionDate(race: { sessions: { type: string; date: string }[]; date: string }): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

export default async function CalendarPage() {
  const year = new Date().getFullYear();
  const availableSeries = SERIES_LIST.filter((s) => s.available);

  const allRacesNested = await Promise.all(
    availableSeries.map(async (series) => {
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

  const seriesCountdowns: SeriesCountdownInfo[] = availableSeries.map((series) => {
    const seriesRaces = allRacesNested[availableSeries.indexOf(series)] ?? [];
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
      series,
    };
  });

  return (
    <CalendarClient
      races={allRaces}
      seriesCountdowns={seriesCountdowns}
      availableSeries={availableSeries}
    />
  );
}
