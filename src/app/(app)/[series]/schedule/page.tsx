import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { RaceCard } from "@/components/race/RaceCard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Race } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
}

function getRaceDate(race: Race): Date {
  const raceSession = race.sessions.find((s) => s.type === "race");
  return new Date(raceSession?.date ?? race.date);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  return { title: `${config?.name ?? slug} — Takvim` };
}

export default async function SchedulePage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);

  const completed = races
    .filter((r) => r.status === "completed")
    .sort((a, b) => getRaceDate(b).getTime() - getRaceDate(a).getTime());

  const upcoming = races
    .filter((r) => r.status !== "completed")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold">{config.name} — Takvim</h1>
        <p className="text-xs text-muted-foreground mt-1">{year} Sezonu · {races.length} yarış</p>
      </div>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Yaklaşan ({upcoming.length})
          </h2>
          {upcoming.map((race) => (
            <RaceCard key={race.round} race={race} series={config} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Tamamlanan ({completed.length})
          </h2>
          {completed.map((race) => (
            <RaceCard key={race.round} race={race} series={config} />
          ))}
        </section>
      )}

      {races.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Henüz takvim verisi yok.</p>
        </div>
      )}
    </div>
  );
}
