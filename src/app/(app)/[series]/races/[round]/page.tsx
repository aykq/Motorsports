import { getCachedRaceByRound, getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getRaceDetail } from "@/lib/race-detail";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import {
  MapPin,
  Calendar,
  Clock,
  Zap,
  Trophy,
  Timer,
  AlertTriangle,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Minus,
  Flag,
  CircleDot,
} from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { TireStints } from "@/components/race/TireStints";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WMO_DESCRIPTIONS } from "@/lib/weather";
import type { Metadata } from "next";
import type { RaceResult, Standing } from "@/types/series";

export const dynamic = "force-dynamic";

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

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  RED: { label: "Kırmızı Bayrak", color: "text-red-500" },
  YELLOW: { label: "Sarı Bayrak", color: "text-yellow-500" },
  DOUBLE_YELLOW: { label: "Çift Sarı", color: "text-yellow-400" },
  GREEN: { label: "Yeşil Bayrak", color: "text-green-500" },
  CHEQUERED: { label: "Damalı Bayrak", color: "text-foreground" },
  BLACK: { label: "Siyah Bayrak", color: "text-foreground" },
  BLACK_AND_WHITE: { label: "Siyah-Beyaz", color: "text-foreground" },
};

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
    dayName: date.toLocaleDateString("tr-TR", { weekday: "long" }),
  };
}

function formatWeatherDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const cls = cn("shrink-0", className);
  if (code === 0 || code === 1) return <Zap className={cls} />;
  if (code <= 3) return <Cloud className={cls} />;
  if (code >= 61 && code <= 82) return <CloudRain className={cls} />;
  if (code >= 95) return <AlertTriangle className={cls} />;
  return <Cloud className={cls} />;
}

function GridChange({ grid, position }: { grid?: number; position: number }) {
  if (!grid) return null;
  const diff = grid - position;
  if (diff === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-green-500 text-[10px] font-medium">
        <ChevronUp className="w-3 h-3" />{diff}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-500 text-[10px] font-medium">
      <ChevronDown className="w-3 h-3" />{Math.abs(diff)}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h2>
  );
}

function StandingRow({ standing, rank }: { standing: Standing; rank: number }) {
  const name = standing.driver
    ? `${standing.driver.firstName} ${standing.driver.lastName}`
    : (standing.team?.name ?? "—");
  const sub = standing.driver?.team ?? standing.team?.nationality;
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
      <span
        className={cn(
          "w-5 text-right font-bold shrink-0",
          rank === 1 && "text-yellow-500",
          rank === 2 && "text-zinc-400",
          rank === 3 && "text-amber-600",
          rank > 3 && "text-muted-foreground"
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {sub && <p className="text-muted-foreground truncate">{sub}</p>}
      </div>
      <span className="font-bold shrink-0">{standing.points}</span>
      {standing.wins > 0 && (
        <span className="text-muted-foreground shrink-0">{standing.wins}G</span>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, round } = await params;
  const config = getSeriesConfig(slug);
  const year = new Date().getFullYear();
  const race = await getCachedRaceByRound(slug, year, parseInt(round));
  if (!race) {
    const { races } = await getCachedSchedule(slug, year);
    const fallback = races.find((r) => r.round === parseInt(round));
    return { title: fallback ? `${fallback.name} — ${config?.name ?? slug}` : "Yarış Detayı" };
  }
  return { title: `${race.name} — ${config?.name ?? slug}` };
}

export default async function RaceDetailPage({ params }: Props) {
  const { series: slug, round: roundStr } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const round = parseInt(roundStr);
  const year = new Date().getFullYear();

  let race = await getCachedRaceByRound(slug, year, round);
  if (!race) {
    const { races } = await getCachedSchedule(slug, year);
    race = races.find((r) => r.round === round) ?? null;
  }
  if (!race) notFound();

  const isCompleted = race.status === "completed";
  const isLive = race.status === "live";
  const allResults = race.results ?? [];
  const fastestLapHolder = allResults.find((r) => r.fastestLap);

  const detail = await getRaceDetail(slug, year, round, race);

  const { pitStops, tireStints, raceControl, driverStandingsAfter, teamStandingsAfter, weather } = detail;

  const raceSession = race.sessions.find((s) => s.type === "race");
  const { date: raceDateStr, time: raceTimeStr } = raceSession
    ? formatDateTime(raceSession.date)
    : { date: "—", time: "—" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton fallbackHref={`/${slug}/schedule`} label="Takvim" />

      {/* ── Header ── */}
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
        <h1 className="text-2xl font-bold leading-tight">{race.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />{raceDateStr}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{raceTimeStr} (İST)
          </span>
        </div>
      </div>

      {/* ── Program ── */}
      <section className="space-y-2">
        <SectionHeader title="Program" />
        <div className="rounded-lg border border-border overflow-hidden">
          {race.sessions.map((session) => {
            const { date, time, dayName } = formatDateTime(session.date);
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
                  <span className="hidden sm:block capitalize">{dayName}</span>
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

      {/* ── Weather (upcoming) ── */}
      {!isCompleted && weather.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Hava Durumu Tahmini" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {weather.map((day) => (
              <div
                key={day.date}
                className="rounded-lg border border-border p-3 space-y-1.5 bg-card"
              >
                <p className="text-xs text-muted-foreground">{formatWeatherDate(day.date)}</p>
                <div className="flex items-center gap-1.5">
                  <WeatherIcon code={day.weatherCode} className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs truncate">{WMO_DESCRIPTIONS[day.weatherCode] ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-0.5">
                    <Thermometer className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">{day.tempMax}°</span>
                    <span className="text-muted-foreground">/{day.tempMin}°</span>
                  </span>
                  {day.precipitationProbability > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-400">
                      <CloudRain className="w-3 h-3" />
                      {day.precipitationProbability}%
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Wind className="w-3 h-3" />
                    {day.windSpeed}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Yarış Sonuçları (completed) ── */}
      {isCompleted && allResults.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionHeader title="Yarış Sonuçları" />
            {fastestLapHolder && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Zap className="w-3 h-3" />
                <span>
                  {fastestLapHolder.driverName.split(" ").pop()}
                  {fastestLapHolder.fastestLapTime && (
                    <span className="text-muted-foreground ml-1">({fastestLapHolder.fastestLapTime})</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1.5rem_1rem_1fr_2.5rem_5rem] text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border bg-muted/30 gap-1">
              <span className="text-right">P</span>
              <span />
              <span className="ml-1">Pilot / Takım</span>
              <span className="text-right">Puan</span>
              <span className="text-right">Süre / Durum</span>
            </div>
            {allResults.map((result: RaceResult) => {
              const isFinished = result.status === "Finished" || result.status.startsWith("+");
              const displayTime = result.position === 1
                ? (result.time ?? "—")
                : (result.gap ?? (isFinished ? "—" : result.status));
              return (
                <div
                  key={result.position}
                  className="grid grid-cols-[1.5rem_1rem_1fr_2.5rem_5rem] text-xs px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent/30 transition-colors gap-1"
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
                  <div className="self-center">
                    <GridChange grid={result.gridPosition} position={result.position} />
                  </div>
                  <div className="ml-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/${slug}/drivers/${result.driverId}`}
                        className="font-medium truncate hover:underline cursor-pointer"
                      >
                        {result.driverName}
                      </Link>
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

      {/* ── Pit Stopları ── */}
      {isCompleted && pitStops.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Pit Stopları" />
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_2.5rem_5rem] text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-right">Tur</span>
              <span className="ml-2">Pilot</span>
              <span className="text-right">Stop</span>
              <span className="text-right">Süre</span>
            </div>
            {[...pitStops]
              .sort((a, b) => a.lap - b.lap)
              .map((stop, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2rem_1fr_2.5rem_5rem] text-xs px-3 py-2 border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-right text-muted-foreground self-center">{stop.lap}</span>
                  <span className="ml-2 font-medium self-center truncate">{stop.driverName}</span>
                  <span className="text-right text-muted-foreground self-center">{stop.stop}</span>
                  <span className="text-right font-mono self-center">{stop.duration}s</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ── Lastik Stintleri ── */}
      {isCompleted && tireStints.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Lastik Stintleri" />
          <div className="rounded-lg border border-border p-3">
            <TireStints stints={tireStints} results={allResults} />
          </div>
        </section>
      )}

      {/* ── Yarış Olayları ── */}
      {isCompleted && raceControl.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Yarış Olayları" />
          <div className="rounded-lg border border-border overflow-hidden">
            {raceControl.map((event, i) => {
              const flagStyle = event.flag ? FLAG_LABELS[event.flag] : null;
              const isSafetyCar = event.category === "SafetyCar" ||
                event.message.toUpperCase().includes("SAFETY CAR");
              const isPenalty = event.message.toUpperCase().includes("PENALTY") ||
                event.message.toUpperCase().includes("INVESTIGATION");
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 text-xs hover:bg-accent/30 transition-colors"
                >
                  <div className="w-8 text-right text-muted-foreground shrink-0 pt-0.5">
                    {event.lap != null ? `L${event.lap}` : "—"}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {isSafetyCar ? (
                      <CircleDot className="w-3.5 h-3.5 text-yellow-500" />
                    ) : isPenalty ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <Flag className={cn("w-3.5 h-3.5", flagStyle?.color ?? "text-muted-foreground")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug">{event.message}</p>
                    {event.driverNumber && (
                      <p className="text-muted-foreground">
                        #{event.driverNumber}
                        {event.driverAcronym && ` — ${event.driverAcronym}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Şampiyona Durumu (completed) ── */}
      {isCompleted && driverStandingsAfter.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Şampiyona Durumu (Bu Yarış Sonrası)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pilot Sıralaması */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Trophy className="w-3 h-3" />
                <span>Pilot Şampiyonası</span>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                {driverStandingsAfter.slice(0, 10).map((s) => (
                  <StandingRow key={s.position} standing={s} rank={s.position} />
                ))}
              </div>
            </div>

            {/* Takım Sıralaması */}
            {teamStandingsAfter.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>Takım Şampiyonası</span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  {teamStandingsAfter.slice(0, 10).map((s) => (
                    <StandingRow key={s.position} standing={s} rank={s.position} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Demeçler Placeholder ── */}
      <section className="space-y-2">
        <SectionHeader title="Pilot & Takım Demeçleri" />
        <div className="rounded-lg border border-border border-dashed p-6 flex flex-col items-center gap-2 text-center">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "Yarışa ait demeçler AI analizi ile yakında burada görünecek."
              : "Sürücü ve takım demeçleri yarış haftası AI ile burada toplanacak."}
          </p>
        </div>
      </section>

      {/* ── Teknik Analiz Placeholder ── */}
      <section className="space-y-2">
        <SectionHeader title={isCompleted ? "Teknik & Strateji Analizi" : "Beklenen Güncellemeler"} />
        <div className="rounded-lg border border-border border-dashed p-6 flex flex-col items-center gap-2 text-center">
          <Timer className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "Strateji analizi, takım güncellemelerinin etkileri AI analizi ile yakında burada görünecek."
              : "Takımların getirdiği teknik güncellemeler ve etki analizleri AI ile burada görünecek."}
          </p>
        </div>
      </section>

      {/* ── Henüz tamamlanmadı ── */}
      {!isCompleted && !isLive && weather.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Yarış verileri yarış tamamlandıktan sonra burada görünecek.</p>
        </div>
      )}

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center">
        Veri: Jolpica (Ergast) · OpenF1 · Open-Meteo
      </p>
    </div>
  );
}
