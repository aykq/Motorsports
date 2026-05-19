import { getCachedDrivers, getCachedSchedule, getCachedStandings } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, id } = await params;
  const { drivers } = await getCachedDrivers(slug);
  const driver = drivers.find((d) => d.id === id);
  return { title: driver ? `${driver.firstName} ${driver.lastName}` : "Pilot" };
}

export default async function DriverDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const [{ drivers }, { standings: driverStandings }, { races }] = await Promise.all([
    getCachedDrivers(slug),
    getCachedStandings(slug, year, "driver"),
    getCachedSchedule(slug, year),
  ]);

  const driver = drivers.find((d) => d.id === id);
  if (!driver) notFound();

  const standing = driverStandings.find((s) => s.driver?.id === id);

  const raceResults = races
    .filter((r) => r.status === "completed" && r.results?.some((res) => res.driverId === id))
    .map((r) => ({
      race: r,
      result: r.results!.find((res) => res.driverId === id)!,
    }))
    .sort((a, b) => b.race.round - a.race.round);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={`/${slug}/drivers`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Pilotlar
      </Link>

      <div className="flex items-center gap-4">
        {driver.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driver.image}
            alt={driver.lastName}
            className="w-20 h-20 rounded-full object-cover bg-muted shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-xl font-black shrink-0">
            {driver.code ?? driver.lastName[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {driver.firstName} {driver.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {driver.code && <Badge variant="secondary">{driver.code}</Badge>}
            {driver.number && (
              <span className="text-sm text-muted-foreground">#{driver.number}</span>
            )}
            <span className="text-sm text-muted-foreground">{driver.nationality}</span>
          </div>
          {driver.team && (
            <p className="text-sm text-muted-foreground mt-1">{driver.team}</p>
          )}
        </div>
      </div>

      {standing && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-black">{standing.position}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sıralama</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-black">{standing.points}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Puan</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-2xl font-black">{standing.wins}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Galibiyet</p>
          </div>
        </div>
      )}

      {raceResults.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {year} Yarış Sonuçları
          </h2>
          <div className="space-y-1.5">
            {raceResults.map(({ race, result }) => (
              <div
                key={race.round}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border text-sm"
              >
                <span className="w-7 text-right font-bold shrink-0">P{result.position}</span>
                <span className="flex-1 truncate">{race.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {result.time ?? result.gap ?? result.status}
                </span>
                <span className="text-xs font-medium shrink-0">+{result.points}p</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
