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
  Sparkles,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { TireStints } from "@/components/race/TireStints";
import { RaceControlSection } from "@/components/race/RaceControlSection";
import { RaceWeatherSection } from "@/components/race/RaceWeatherSection";
import { CircuitLayoutImage } from "@/components/race/CircuitLayoutImage";
import { CircuitHeroPhoto } from "@/components/race/CircuitHeroPhoto";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getF1CircuitMapUrl, getF1CircuitCoords, getF1CircuitPhotoUrl } from "@/lib/circuit-data";
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


function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
    dayName: date.toLocaleDateString("tr-TR", { weekday: "long" }),
  };
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

function CompactResultRow({ result, slug }: { result: RaceResult; slug: string }) {
  const { status } = result;
  const isLapped = status.startsWith("+") && status.toLowerCase().includes("lap");
  const isDNS = status === "Did Not Start" || status === "Withdrew";
  const isDNF = status !== "Finished" && !isLapped && !isDNS;

  const displayName = result.driverCode ?? result.driverName.split(" ").pop()!;
  const displayTime = result.gap ?? (isDNS ? "DNS" : status);
  const showingStatusText = result.gap == null;

  return (
    <div
      className="grid grid-cols-[1.5rem_1fr_4rem] items-center gap-1 text-xs px-2 py-1.5 hover:bg-accent/30 transition-colors"
    >
      <span className="text-right font-bold shrink-0 text-foreground">
        {result.position}
      </span>
      <div className="px-1 min-w-0">
        <Link
          href={`/${slug}/drivers/${result.driverId}`}
          className={cn(
            "font-medium truncate block hover:underline cursor-pointer leading-snug",
            (isDNF || isDNS) && "opacity-60",
          )}
        >
          {displayName}
        </Link>
        <span className="text-[10px] text-muted-foreground truncate block leading-snug">
          {result.team}
        </span>
      </div>
      <span
        className={cn(
          "text-right text-[10px] shrink-0",
          showingStatusText && (isDNF || isDNS) ? "text-red-400" : "text-foreground",
        )}
      >
        {displayTime}
      </span>
    </div>
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

  const coords =
    slug === "f1"
      ? (getF1CircuitCoords(race.circuitId) ??
          (race.circuitLat && race.circuitLng
            ? ([race.circuitLat, race.circuitLng] as [number, number])
            : null))
      : race.circuitLat && race.circuitLng
        ? ([race.circuitLat, race.circuitLng] as [number, number])
        : null;
  const layoutUrl = slug === "f1" ? getF1CircuitMapUrl(race.circuitId) : null;
  const photoUrl = slug === "f1" ? getF1CircuitPhotoUrl(race.circuitId) : null;

  const allResults = race.results ?? [];
  const fastestLapHolder = allResults.find((r) => r.fastestLap);

  const detail = await getRaceDetail(slug, year, round, race);

  const { tireStints, raceControl, raceControlTr, driverStandingsAfter, teamStandingsAfter } = detail;

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

      {/* ── Circuit Hero ── */}
      {slug === "f1" && (
        <div className="rounded-xl overflow-hidden aspect-[21/9] relative bg-card">
          {photoUrl && <CircuitHeroPhoto src={photoUrl} alt={race.circuitName} />}
          {photoUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
          )}
        </div>
      )}

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

      {/* ── Weather ── */}
      {coords && (
        <RaceWeatherSection
          raceDate={race.date}
          sessions={race.sessions}
          lat={coords[0]}
          lng={coords[1]}
          status={race.status}
          accentColor={config.color}
        />
      )}

      {/* ── Yarış Sonuçları (completed) ── */}
      {isCompleted && allResults.length > 0 && (() => {
        const topResults = allResults.filter((r) => r.position <= 10);
        const nonPoints = allResults.filter((r) => r.position > 10);
        const npHalf = Math.ceil(nonPoints.length / 2);
        return (
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
              {/* Header — puan pozisyonları için */}
              <div className="grid grid-cols-[1.5rem_1rem_1fr_2.5rem_5rem] text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border bg-muted/30 gap-1">
                <span className="text-right">P</span>
                <span />
                <span className="ml-1">Pilot / Takım</span>
                <span className="text-right">Puan</span>
                <span className="text-right">Süre / Durum</span>
              </div>

              {/* P1–P10: detaylı satırlar */}
              <div className="divide-y divide-border">
                {topResults.map((result: RaceResult) => {
                  const isFinished = result.status === "Finished" || result.status.startsWith("+");
                  const displayTime = result.position === 1
                    ? (result.time ?? "—")
                    : (result.gap ?? (isFinished ? "—" : result.status));
                  return (
                    <div
                      key={result.position}
                      className="grid grid-cols-[1.5rem_1rem_1fr_2.5rem_5rem] text-xs px-3 py-2.5 hover:bg-accent/30 transition-colors gap-1"
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
                          result.gap == null && !isFinished && result.position !== 1 ? "text-red-400" : "text-foreground"
                        )}
                      >
                        {displayTime}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* P11+: kompakt 2-sütun */}
              {nonPoints.length > 0 && (
                <div className="border-t border-dashed border-border">
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="divide-y divide-border">
                      {nonPoints.slice(0, npHalf).map((r) => (
                        <CompactResultRow key={r.position} result={r} slug={slug} />
                      ))}
                    </div>
                    <div className="divide-y divide-border">
                      {nonPoints.slice(npHalf).map((r) => (
                        <CompactResultRow key={r.position} result={r} slug={slug} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

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
        <RaceControlSection events={raceControl} eventsTr={raceControlTr} />
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
      {!isCompleted && !isLive && !coords && (
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
