import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, id } = await params;
  const year = new Date().getFullYear();
  const config = getSeriesConfig(slug);
  const { races } = await getCachedSchedule(slug, year);
  const race = races.find((r) => r.circuitId === id);
  return { title: race ? race.circuitName : "Pist" };
}

export default async function CircuitDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);

  const circuitRaces = races
    .filter((r) => r.circuitId === id)
    .sort((a, b) => b.round - a.round);

  if (circuitRaces.length === 0) notFound();

  const circuit = {
    id,
    name: circuitRaces[0].circuitName,
    location: circuitRaces[0].location,
    country: circuitRaces[0].country,
  };

  const completedRaces = circuitRaces.filter((r) => r.status === "completed");
  const upcomingRaces = circuitRaces.filter((r) => r.status !== "completed");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={`/${slug}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {config.name}
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{circuit.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{circuit.location}, {circuit.country}</span>
        </div>
      </div>

      {upcomingRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Yaklaşan
          </h2>
          {upcomingRaces.map((race) => {
            const raceSession = race.sessions.find((s) => s.type === "race");
            return (
              <div
                key={race.round}
                className="rounded-lg bg-card border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{race.name}</p>
                  <Badge variant="outline" className="text-xs">Tur {race.round}</Badge>
                </div>
                {raceSession && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(raceSession.date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {completedRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Geçmiş Yarışlar
          </h2>
          {completedRaces.map((race) => {
            const winner = race.results?.[0];
            return (
              <div
                key={race.round}
                className="rounded-lg bg-card border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{race.name}</p>
                  <Badge variant="secondary" className="text-xs">Tur {race.round}</Badge>
                </div>
                {winner && (
                  <p className="text-xs text-muted-foreground">
                    Kazanan: <span className="text-foreground font-medium">{winner.driverName}</span>
                    {winner.time && <span> · {winner.time}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
