import { getCachedRaceByRound, getCachedSchedule, setCachedSchedule } from "@/lib/cache";
import { jolpicaFetchRaceResults } from "@/lib/adapters/f1/jolpica";
import { fetchWECRaceResults } from "@/lib/adapters/wec/motorsport-results-scraper";
import { getSeriesConfig } from "@/lib/series-config";
import { getRaceDetail } from "@/lib/race-detail";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import { MapPin, Calendar, Clock, Sparkles, Timer } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { RaceWeatherSection } from "@/components/race/RaceWeatherSection";
import { SessionTabs, type SessionTab } from "@/components/race/SessionTabs";
import { WECRaceResultsSection } from "@/components/race/WECRaceResultsSection";
import { CircuitHeroPhoto } from "@/components/race/CircuitHeroPhoto";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getF1CircuitCoords, getF1CircuitPhotoUrl } from "@/lib/circuit-data";
import { lookupCircuitCoords } from "@/lib/circuit-coords";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ series: string; round: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, round } = await params;
  const config = getSeriesConfig(slug);
  const year = new Date().getFullYear();
  const race = await getCachedRaceByRound(slug, year, parseInt(round));
  if (!race) {
    const { races } = await getCachedSchedule(slug, year);
    const fallback = races.find((r) => r.round === parseInt(round));
    return { title: fallback ? `${fallback.name} — ${config?.name ?? slug}` : "Race Detail" };
  }
  return { title: `${race.name} — ${config?.name ?? slug}` };
}

export default async function RaceDetailPage({ params }: Props) {
  const { series: slug, round: roundStr } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("racePage");
  const tSessions = await getTranslations("sessions");
  const tTabLabels = await getTranslations("tabLabels");
  const tStatus = await getTranslations("raceStatus");
  const locale = await getLocale();
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";

  const round = parseInt(roundStr);
  const year = new Date().getFullYear();

  let race = await getCachedRaceByRound(slug, year, round);
  if (!race) {
    const { races } = await getCachedSchedule(slug, year);
    race = races.find((r) => r.round === round) ?? null;
  }
  if (!race) notFound();

  // Tamamlanmış yarış ama sonuç yok → ilgili kaynaktan çek + cache'e yaz
  if (race.status === "completed" && !race.results?.length) {
    if (slug === "f1") {
      const freshResults = await jolpicaFetchRaceResults(year, round);
      if (freshResults.length) {
        race = { ...race, results: freshResults };
        void setCachedSchedule(slug, year, [race]);
      }
    } else if (slug === "wec") {
      const wecResults = await fetchWECRaceResults(year, race.name, race.circuitName);
      if (wecResults.length) {
        race = { ...race, results: wecResults };
        void setCachedSchedule(slug, year, [race]);
      }
    }
  }

  const isCompleted = race.status === "completed";
  const isLive = race.status === "live";

  const coords: [number, number] | null = (() => {
    if (slug === "f1") {
      return (
        getF1CircuitCoords(race.circuitId) ??
        (race.circuitLat && race.circuitLng ? [race.circuitLat, race.circuitLng] : null)
      );
    }
    if (race.circuitLat && race.circuitLng) return [race.circuitLat, race.circuitLng];
    return lookupCircuitCoords(race.circuitName);
  })();
  const photoUrl = slug === "f1" ? getF1CircuitPhotoUrl(race.circuitId) : null;

  const now = new Date();
  const fp1Done = race.sessions.find((s) => s.type === "practice1") ? new Date(race.sessions.find((s) => s.type === "practice1")!.date) < now : false;
  const fp2Done = race.sessions.find((s) => s.type === "practice2") ? new Date(race.sessions.find((s) => s.type === "practice2")!.date) < now : false;
  const fp3Done = race.sessions.find((s) => s.type === "practice3") ? new Date(race.sessions.find((s) => s.type === "practice3")!.date) < now : false;
  const sprintQualiDone = race.sessions.find((s) => s.type === "sprintQuali") ? new Date(race.sessions.find((s) => s.type === "sprintQuali")!.date) < now : false;
  const sprintDone = race.sessions.find((s) => s.type === "sprint") ? new Date(race.sessions.find((s) => s.type === "sprint")!.date) < now : false;
  const qualifyingDone = race.sessions.find((s) => s.type === "qualifying") ? new Date(race.sessions.find((s) => s.type === "qualifying")!.date) < now : false;

  const detail = await getRaceDetail(slug, year, round, race);
  const {
    tireStints,
    raceControl,
    raceControlTr,
    driverStandingsAfter,
    teamStandingsAfter,
    qualifyingResults = [],
    sprintResults = [],
    practice1Results = [],
    practice2Results = [],
    practice3Results = [],
  } = detail;

  const allResults = race.results ?? [];
  const podiumDrivers = isCompleted && allResults.length >= 3 ? allResults.slice(0, 3) : null;

  // ── Build session tabs (only completed sessions with data) ──
  const tabs: SessionTab[] = [];
  if (fp1Done && practice1Results.length > 0)
    tabs.push({ type: "practice1", shortLabel: tTabLabels("practice1"), fullLabel: tSessions("practice1") });
  if (fp2Done && practice2Results.length > 0)
    tabs.push({ type: "practice2", shortLabel: tTabLabels("practice2"), fullLabel: tSessions("practice2") });
  if (fp3Done && practice3Results.length > 0)
    tabs.push({ type: "practice3", shortLabel: tTabLabels("practice3"), fullLabel: tSessions("practice3") });
  if (sprintDone && sprintResults.length > 0)
    tabs.push({ type: "sprint", shortLabel: tTabLabels("sprint"), fullLabel: tSessions("sprint") });
  if (qualifyingDone && qualifyingResults.length > 0)
    tabs.push({ type: "qualifying", shortLabel: tTabLabels("qualifying"), fullLabel: tSessions("qualifying") });
  if ((isCompleted || isLive) && allResults.length > 0)
    tabs.push({ type: "race", shortLabel: tTabLabels("race"), fullLabel: tSessions("race") });

  // Default: last tab (most recent completed session)
  const defaultTab = tabs[tabs.length - 1]?.type ?? "practice1";

  // ── Label bundles ──
  const practiceLabels = {
    colPos: t("colPos"),
    colDriverTeam: t("colDriverTeam"),
    colGap: t("colGap"),
    colLap: t("colLap"),
  };
  const qualifyingLabels = {
    qualifyingResults: t("qualifyingResults"),
    q2Eliminated: t("q2Eliminated"),
    q1Eliminated: t("q1Eliminated"),
  };
  const raceLabels = {
    results: t("results"),
    tireStints: t("tireStints"),
    championship: t("championship"),
    driverChampionship: t("driverChampionship"),
    teamChampionship: t("teamChampionship"),
    colPos: t("colPos"),
    colDriverTeam: t("colDriverTeam"),
    colPoints: t("colPoints"),
    colTimeStatus: t("colTimeStatus"),
  };

  function formatDateTime(dateStr: string) {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }),
      time: date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
      dayName: date.toLocaleDateString(dateLocale, { weekday: "long" }),
    };
  }

  const raceSession = race.sessions.find((s) => s.type === "race");
  const { date: raceDateStr, time: raceTimeStr } = raceSession
    ? formatDateTime(raceSession.date)
    : { date: "—", time: "—" };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <BackButton fallbackHref={`/${slug}/schedule`} label={t("schedule")} />

      {/* ── Livery header ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border p-5 space-y-2"
        style={{ background: `linear-gradient(110deg, color-mix(in oklch, ${config.color} 20%, var(--card)), var(--card) 55%)` }}
      >
        <span
          aria-hidden
          className="absolute -right-10 -top-8 -bottom-8 w-40 skew-x-[-18deg] opacity-15"
          style={{ background: `linear-gradient(180deg, ${config.color}, transparent)` }}
        />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/${slug}`}
              className="font-display text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: config.color + "22", color: config.color }}
            >
              {config.shortName}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{t("round", { round: race.round })}</span>
            <Badge
              variant={isLive ? "destructive" : isCompleted ? "secondary" : "outline"}
              className={cn("font-display uppercase tracking-wider text-[11px]", isLive && "animate-pulse")}
            >
              {tStatus(race.status as "upcoming" | "live" | "completed" | "cancelled") ?? race.status}
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">{race.name}</h1>
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
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />{raceDateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{raceTimeStr} ({t("ist")})
            </span>
          </div>

          {podiumDrivers && (() => {
            const [r1, r2, r3] = podiumDrivers;
            const shortName = (r: typeof r1) => r.driverCode ?? r.driverName.split(" ").pop()!;
            return (
              <div className="flex items-end justify-center gap-2 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col items-center gap-0.5" style={{ opacity: 0.85 }}>
                  <span className="font-mono text-[9px] text-zinc-400 tracking-widest">P2</span>
                  <div className="rounded-lg border border-border/50 bg-background/20 backdrop-blur-sm px-3 py-1.5 text-center">
                    <p className="font-display text-sm font-bold">{shortName(r2)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{r2.gap ?? "—"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-0.5 -translate-y-1.5">
                  <span className="font-mono text-[9px] text-yellow-500 tracking-widest">P1</span>
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-center">
                    <p className="font-display text-base font-extrabold text-yellow-500">{shortName(r1)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{r1.time ?? "—"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-0.5" style={{ opacity: 0.85 }}>
                  <span className="font-mono text-[9px] text-amber-600 tracking-widest">P3</span>
                  <div className="rounded-lg border border-border/50 bg-background/20 backdrop-blur-sm px-3 py-1.5 text-center">
                    <p className="font-display text-sm font-bold">{shortName(r3)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{r3.gap ?? "—"}</p>
                  </div>
                </div>
              </div>
            );
          })()}
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
        <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t("schedule")}
        </h2>
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-1">
            {race.sessions.map((session) => {
              const { date, time, dayName } = formatDateTime(session.date);
              const isPast = new Date(session.date) < now;
              const isRaceSession = session.type === "race";
              const sessionKey = session.type as Parameters<typeof tSessions>[0];
              return (
                <div
                  key={session.type}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl border p-3 min-w-[104px] transition-all",
                    isRaceSession
                      ? "border-border bg-card"
                      : "border-border bg-transparent",
                    isPast && !isRaceSession && "opacity-55"
                  )}
                  style={isRaceSession ? { borderColor: `${config.color}55` } : undefined}
                >
                  <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted-foreground capitalize">
                    {dayName}
                  </span>
                  <span className={cn(
                    "font-display text-xs font-semibold leading-tight",
                    isRaceSession && "text-foreground"
                  )}>
                    {tSessions.has(sessionKey) ? tSessions(sessionKey) : session.type}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{time}</span>
                  <span className="text-[10px] text-muted-foreground">{date}</span>
                </div>
              );
            })}
          </div>
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
          enableOpenF1={slug === "f1"}
        />
      )}

      {/* ── WEC Race Results ── */}
      {slug === "wec" && (isCompleted || isLive) && allResults.length > 0 && (
        <WECRaceResultsSection
          results={allResults}
          slug={slug}
          driverStandingsAfter={driverStandingsAfter}
          teamStandingsAfter={teamStandingsAfter}
          labels={{
            results: t("results"),
            championship: t("championship"),
            driverChampionship: t("driverChampionship"),
            teamChampionship: t("teamChampionship"),
            loadMore: t("loadMore"),
            viewAll: t("viewAll"),
          }}
        />
      )}

      {/* ── Session Tabs (Practice / Qualifying / Race) ── */}
      {slug === "f1" && tabs.length > 0 && (
        <SessionTabs
          tabs={tabs}
          defaultTab={defaultTab}
          practice1Results={practice1Results}
          practice2Results={practice2Results}
          practice3Results={practice3Results}
          qualifyingResults={qualifyingResults}
          sprintResults={sprintResults}
          raceResults={allResults}
          tireStints={tireStints}
          raceControl={raceControl}
          raceControlTr={raceControlTr}
          driverStandingsAfter={driverStandingsAfter}
          teamStandingsAfter={teamStandingsAfter}
          slug={slug}
          practiceLabels={practiceLabels}
          qualifyingLabels={qualifyingLabels}
          raceLabels={raceLabels}
        />
      )}

      {/* ── Quotes Placeholder ── */}
      <section className="space-y-2">
        <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t("quotes")}
        </h2>
        <div className="rounded-lg border border-border border-dashed p-6 flex flex-col items-center gap-2 text-center">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isCompleted ? t("quotesCompleted") : t("quotesPending")}
          </p>
        </div>
      </section>

      {/* ── Analysis Placeholder ── */}
      <section className="space-y-2">
        <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {isCompleted ? t("analysis") : t("updates")}
        </h2>
        <div className="rounded-lg border border-border border-dashed p-6 flex flex-col items-center gap-2 text-center">
          <Timer className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isCompleted ? t("analysisCompleted") : t("analysisPending")}
          </p>
        </div>
      </section>

      {!isCompleted && !isLive && !coords && tabs.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">{t("noDataPending")}</p>
        </div>
      )}

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center">{t("dataFooter")}</p>
    </div>
  );
}
