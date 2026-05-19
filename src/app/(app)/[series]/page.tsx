import { getCachedSchedule, getCachedStandings } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { RaceCard } from "@/components/race/RaceCard";
import { Countdown } from "@/components/race/Countdown";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
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
  return { title: config?.name ?? slug.toUpperCase() };
}

export default async function SeriesPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const [{ races }, { standings: driverStandings }, { standings: teamStandings }] =
    await Promise.all([
      getCachedSchedule(slug, year),
      getCachedStandings(slug, year, "driver"),
      getCachedStandings(slug, year, "team"),
    ]);

  const upcoming = races
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime());

  const nextRace = upcoming[0] ?? null;
  const nextRaceDate = nextRace ? getRaceDate(nextRace).toISOString() : null;

  const lastRace = races
    .filter((r) => r.status === "completed")
    .sort((a, b) => getRaceDate(b).getTime() - getRaceDate(a).getTime())[0] ?? null;

  const top5Drivers = driverStandings.slice(0, 5);
  const top5Teams = teamStandings.slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.shortName.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-xl font-bold">{config.name}</h1>
          <p className="text-xs text-muted-foreground">{year} Sezonu</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/${slug}/schedule`}
          className="text-center text-sm py-2 px-3 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Takvim
        </Link>
        <Link
          href={`/${slug}/standings`}
          className="text-center text-sm py-2 px-3 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Puan Tablosu
        </Link>
        <Link
          href={`/${slug}/drivers`}
          className="text-center text-sm py-2 px-3 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Pilotlar
        </Link>
        <Link
          href={`/${slug}/circuits`}
          className="text-center text-sm py-2 px-3 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Pistler
        </Link>
      </div>

      {nextRace && nextRaceDate && (
        <section className="rounded-xl bg-card border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Sıradaki Yarış
          </h2>
          <Countdown targetDate={nextRaceDate} />
          <RaceCard race={nextRace} series={config} compact />
        </section>
      )}

      {lastRace && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Son Yarış
          </h2>
          <RaceCard race={lastRace} series={config} />
        </section>
      )}

      {top5Drivers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Sürücü Şampiyonası
            </h2>
            <Link
              href={`/${slug}/standings`}
              className="text-xs text-rose-500 hover:underline"
            >
              Tümü
            </Link>
          </div>
          <div className="space-y-1.5">
            {top5Drivers.map((s) => (
              <div
                key={s.position}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border text-sm"
              >
                <span className="w-5 text-right text-muted-foreground font-medium shrink-0">
                  {s.position}
                </span>
                <span className="flex-1 font-medium truncate">
                  {s.driver?.code ?? `${s.driver?.firstName ?? ""} ${s.driver?.lastName ?? ""}`}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {s.driver?.team}
                </span>
                <Badge variant="secondary" className="shrink-0 font-bold">
                  {s.points}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {top5Teams.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Takım Şampiyonası
            </h2>
            <Link
              href={`/${slug}/standings?type=team`}
              className="text-xs text-rose-500 hover:underline"
            >
              Tümü
            </Link>
          </div>
          <div className="space-y-1.5">
            {top5Teams.map((s) => (
              <div
                key={s.position}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border text-sm"
              >
                <span className="w-5 text-right text-muted-foreground font-medium shrink-0">
                  {s.position}
                </span>
                <span className="flex-1 font-medium truncate">{s.team?.name}</span>
                <Badge variant="secondary" className="shrink-0 font-bold">
                  {s.points}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {races.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Henüz veri yok.</p>
        </div>
      )}
    </div>
  );
}
