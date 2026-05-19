import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string; round: string }>;
}

const SESSION_LABELS: Record<string, string> = {
  practice1: "1. Antrenman",
  practice2: "2. Antrenman",
  practice3: "3. Antrenman",
  qualifying: "Sıralama",
  sprintQuali: "Sprint Sıralama",
  sprint: "Sprint",
  race: "Yarış",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Yaklaşan",
  live: "Canlı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, round } = await params;
  const config = getSeriesConfig(slug);
  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);
  const race = races.find((r) => r.round === parseInt(round));
  return { title: race ? `${race.name} — ${config?.name ?? slug}` : "Yarış Detayı" };
}

export default async function RaceDetailPage({ params }: Props) {
  const { series: slug, round } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);
  const race = races.find((r) => r.round === parseInt(round));
  if (!race) notFound();

  const isCompleted = race.status === "completed";
  const isLive = race.status === "live";
  const allResults = race.results ?? [];
  const fastestLapHolder = allResults.find((r) => r.fastestLap);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={`/${slug}/schedule`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Takvim
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="text-xs font-bold"
            style={{ backgroundColor: config.color + "22", color: config.color }}
          >
            {config.shortName}
          </Badge>
          <span className="text-xs text-muted-foreground">Yarış {race.round}</span>
          <Badge
            variant={isLive ? "destructive" : isCompleted ? "secondary" : "outline"}
            className={cn("text-xs", isLive && "animate-pulse")}
          >
            {STATUS_LABELS[race.status] ?? race.status}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">{race.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <Link
            href={`/${slug}/circuits/${race.circuitId}`}
            className="hover:text-foreground hover:underline transition-colors cursor-pointer"
          >
            {race.circuitName}
          </Link>
          <span className="text-muted-foreground/50">·</span>
          <span>{race.location}, {race.country}</span>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Program</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          {race.sessions.map((session) => {
            const { date, time } = formatDateTime(session.date);
            const isRaceSession = session.type === "race";
            return (
              <div
                key={session.type}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border last:border-0",
                  isRaceSession && "bg-card font-medium"
                )}
              >
                <span className={cn("w-32 shrink-0 text-sm", isRaceSession ? "text-foreground" : "text-muted-foreground")}>
                  {SESSION_LABELS[session.type] ?? session.type}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{date}</span>
                  <Clock className="w-3 h-3 ml-1 shrink-0" />
                  <span>{time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isCompleted && allResults.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Sonuçlar
            </h2>
            {fastestLapHolder && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Zap className="w-3 h-3" />
                <span>En hızlı tur: {fastestLapHolder.driverName}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_2.5rem_5rem] text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-right">P</span>
              <span className="ml-2">Pilot / Takım</span>
              <span className="text-right">Puan</span>
              <span className="text-right">Süre / Durum</span>
            </div>
            {allResults.map((result) => {
              const isFinished = result.status === "Finished" || result.status.startsWith("+");
              const displayTime = result.position === 1
                ? (result.time ?? "—")
                : (result.gap ?? (isFinished ? "—" : result.status));
              return (
                <div
                  key={result.position}
                  className="grid grid-cols-[2rem_1fr_2.5rem_5rem] text-xs px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <span
                    className={cn(
                      "text-right font-bold self-center shrink-0",
                      result.position === 1 && "text-yellow-500",
                      result.position === 2 && "text-zinc-400",
                      result.position === 3 && "text-amber-600",
                      result.position > 3 && "text-muted-foreground"
                    )}
                  >
                    {result.position}
                  </span>
                  <div className="ml-2 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{result.driverName}</span>
                      {result.fastestLap && <Zap className="w-3 h-3 text-purple-400 shrink-0" />}
                    </div>
                    <span className="text-muted-foreground truncate block">{result.team}</span>
                  </div>
                  <span className="text-right self-center font-medium shrink-0">
                    {result.points > 0 ? result.points : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-right self-center shrink-0",
                      !isFinished && result.position !== 1 ? "text-muted-foreground" : ""
                    )}
                  >
                    {displayTime}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isCompleted && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Yarış henüz tamamlanmadı.</p>
        </div>
      )}
    </div>
  );
}
