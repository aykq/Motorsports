import { getCachedSchedule } from "@/lib/cache";
import { SERIES_LIST } from "@/lib/series-config";
import { RaceCard } from "@/components/race/RaceCard";
import { Countdown } from "@/components/race/Countdown";
import type { Race } from "@/types/series";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anasayfa" };

interface RaceWithSeries extends Race {
  seriesSlug: string;
}

function getRaceDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

function isThisWeek(date: Date): boolean {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= now && date <= weekEnd;
}

export default async function DashboardPage() {
  const year = new Date().getFullYear();
  const availableSeries = SERIES_LIST.filter((s) => s.available);

  const allRacesNested = await Promise.all(
    availableSeries.map(async (series) => {
      const { races } = await getCachedSchedule(series.slug, year);
      return races.map((r): RaceWithSeries => ({ ...r, seriesSlug: series.slug }));
    })
  );
  const allRaces = allRacesNested.flat();

  const upcoming = allRaces
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const nextRace = upcoming[0] ?? null;
  const nextRaceSeries = nextRace
    ? SERIES_LIST.find((s) => s.slug === nextRace.seriesSlug)!
    : null;
  const nextRaceDate = nextRace ? getRaceDate(nextRace).toISOString() : null;

  const thisWeekRaces = upcoming.filter((r) => isThisWeek(getRaceDate(r)));
  const laterRaces = upcoming
    .filter((r) => !isThisWeek(getRaceDate(r)))
    .slice(0, 10);

  const recentResults = allRaces
    .filter((r) => r.status === "completed")
    .sort((a, b) => getRaceDate(b).getTime() - getRaceDate(a).getTime())
    .slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {nextRace && nextRaceSeries && nextRaceDate ? (
        <section className="rounded-xl bg-card border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Sıradaki Yarış
          </h2>
          <Countdown targetDate={nextRaceDate} />
          <RaceCard race={nextRace} series={nextRaceSeries} compact />
        </section>
      ) : (
        <section className="rounded-xl bg-card border border-border p-6 text-center text-muted-foreground">
          <p className="text-sm">Yaklaşan yarış bulunamadı.</p>
        </section>
      )}

      {thisWeekRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Bu Hafta
          </h2>
          {thisWeekRaces.map((race) => {
            const series = SERIES_LIST.find((s) => s.slug === race.seriesSlug)!;
            return <RaceCard key={`${race.seriesSlug}-${race.round}`} race={race} series={series} />;
          })}
        </section>
      )}

      {laterRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Yaklaşan Yarışlar
          </h2>
          {laterRaces.map((race) => {
            const series = SERIES_LIST.find((s) => s.slug === race.seriesSlug)!;
            return <RaceCard key={`${race.seriesSlug}-${race.round}`} race={race} series={series} compact />;
          })}
        </section>
      )}

      {recentResults.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Son Sonuçlar
          </h2>
          {recentResults.map((race) => {
            const series = SERIES_LIST.find((s) => s.slug === race.seriesSlug)!;
            return <RaceCard key={`${race.seriesSlug}-${race.round}`} race={race} series={series} />;
          })}
        </section>
      )}

      {allRaces.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Henüz veri yok.</p>
          <p className="text-xs mt-1">
            Veriyi yüklemek için{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              /api/sync/f1
            </code>{" "}
            endpoint&apos;ini çağırın.
          </p>
        </div>
      )}
    </div>
  );
}
