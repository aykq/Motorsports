import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1CircuitSpecs } from "@/lib/circuit-data";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { MapPin, Zap } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  return { title: race ? `${race.circuitName} — ${config?.name ?? slug}` : "Pist" };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-card border border-border p-3 text-center space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
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

  const specs = slug === "f1" ? getF1CircuitSpecs(id) : null;
  const latestCompleted = completedRaces[0];
  const totalLaps = latestCompleted?.results?.[0]?.laps ?? specs?.officialLaps;
  const fastestLapResult = latestCompleted?.results?.find((r) => r.fastestLap);
  const raceWinner = latestCompleted?.results?.[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton fallbackHref={`/${slug}/circuits`} label="Pistler" />

      {/* ── Header ── */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">{circuit.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{circuit.location}, {circuit.country}</span>
        </div>
      </div>

      {/* ── Pist İstatistikleri ── */}
      {specs && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Pist Bilgileri
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Uzunluk" value={`${specs.lengthKm} km`} />
            <StatCard label="Virajlar" value={specs.corners} />
            <StatCard label="DRS Bölgesi" value={specs.drsZones} />
            <StatCard label="Tur Sayısı" value={totalLaps ?? "—"} />
          </div>
          {totalLaps && (
            <p className="text-xs text-muted-foreground text-right">
              Yarış mesafesi ≈ {(specs.lengthKm * totalLaps).toFixed(1)} km
            </p>
          )}
        </section>
      )}

      {/* ── Bu Sezonun En İyileri ── */}
      {(fastestLapResult || raceWinner) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Bu Sezon ({year})
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {raceWinner && (
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 text-sm">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Kazanan</span>
                <span className="font-medium flex-1 truncate">{raceWinner.driverName}</span>
                <span className="text-xs text-muted-foreground truncate shrink-0">{raceWinner.team}</span>
              </div>
            )}
            {fastestLapResult && (
              <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="text-xs text-muted-foreground w-20 shrink-0 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  En Hızlı
                </span>
                <span className="font-medium flex-1 truncate">{fastestLapResult.driverName}</span>
                {fastestLapResult.fastestLapTime && (
                  <span className="font-mono text-xs font-bold shrink-0">
                    {fastestLapResult.fastestLapTime}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Yaklaşan Yarışlar ── */}
      {upcomingRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Yaklaşan
          </h2>
          {upcomingRaces.map((race) => {
            const raceSession = race.sessions.find((s) => s.type === "race");
            return (
              <Link key={race.round} href={`/${slug}/races/${race.round}`}>
                <div className="rounded-lg bg-card border border-border p-4 space-y-2 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{race.name}</p>
                    <Badge variant="outline" className="text-xs">Yarış {race.round}</Badge>
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
              </Link>
            );
          })}
        </section>
      )}

      {/* ── Geçmiş Yarışlar ── */}
      {completedRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Geçmiş Yarışlar
          </h2>
          {completedRaces.map((race) => {
            const winner = race.results?.[0];
            return (
              <Link key={race.round} href={`/${slug}/races/${race.round}`}>
                <div className="rounded-lg bg-card border border-border p-4 space-y-2 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{race.name}</p>
                    <Badge variant="secondary" className="text-xs">Yarış {race.round}</Badge>
                  </div>
                  {winner && (
                    <p className="text-xs text-muted-foreground">
                      Kazanan: <span className="text-foreground font-medium">{winner.driverName}</span>
                      {winner.time && <span> · {winner.time}</span>}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
