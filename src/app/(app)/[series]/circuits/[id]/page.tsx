import { getCachedScheduleMultiYear } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1CircuitInfo, getF1CircuitHistory } from "@/lib/circuit-data";
import { CircuitHistoryCard } from "./CircuitHistoryCard";
import { CircuitLayoutImage } from "@/components/race/CircuitLayoutImage";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { MapPin, Zap, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { RaceWithYear } from "@/types/series";

interface Props {
  params: Promise<{ series: string; id: string }>;
}

async function fetchCircuitRacesAllYears(slug: string, id: string): Promise<RaceWithYear[]> {
  const races = await getCachedScheduleMultiYear(slug);
  return races
    .filter((r) => r.circuitId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  const [circuitRaces, t] = await Promise.all([
    fetchCircuitRacesAllYears(slug, id),
    getTranslations("circuitsPage"),
  ]);
  const race = circuitRaces[0];
  return { title: race ? `${race.circuitName} • ${config?.name ?? slug}` : t("circuit") };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-card border border-border p-3 text-center space-y-1">
      <p className="text-[10px] text-muted-foreground tracking-wide">{label}</p>
      <p className="font-bold text-base">{value}</p>
    </div>
  );
}

export default async function CircuitDetailPage({ params }: Props) {
  const { series: slug, id } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const [t, raceStatusT, locale] = await Promise.all([
    getTranslations("circuitsPage"),
    getTranslations("raceStatus"),
    getLocale(),
  ]);
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const currentYear = new Date().getFullYear();
  const circuitRaces = await fetchCircuitRacesAllYears(slug, id);

  if (circuitRaces.length === 0) notFound();

  const circuit = {
    id,
    name: circuitRaces[0].circuitName,
    location: circuitRaces[0].location,
    country: circuitRaces[0].country,
    lat: circuitRaces[0].circuitLat,
    lng: circuitRaces[0].circuitLng,
  };

  const completedRaces = circuitRaces.filter((r) => r.status === "completed");
  const upcomingRaces = circuitRaces.filter((r) => r.status === "upcoming" || r.status === "live");
  const cancelledRaces = circuitRaces.filter((r) => r.status === "cancelled");

  const { specs, mapUrl: layoutUrl } = slug === "f1" ? await getF1CircuitInfo(id) : { specs: null, mapUrl: null };
  const circuitHistory = slug === "f1" ? await getF1CircuitHistory(id) : null;
  const latestCompleted = completedRaces[0];
  const totalLaps = latestCompleted?.results?.[0]?.laps ?? specs?.officialLaps;
  const fastestLapResult = latestCompleted?.results?.find((r) => r.fastestLap);
  const raceWinner = latestCompleted?.results?.[0];

  const mapsUrl =
    circuit.lat && circuit.lng
      ? `https://maps.google.com/?q=${circuit.lat},${circuit.lng}`
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="px-4 pt-6">
        <BackButton fallbackHref={`/${slug}/circuits`} label={t("title")} />
      </div>

      {/* ── Hero Banner ── */}
      <div
        className="relative px-6 py-8 overflow-hidden space-y-2"
        style={{
          background: `linear-gradient(135deg, ${config.color}40 0%, ${config.color}10 50%, transparent 100%)`,
        }}
      >
        <div
          className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 blur-2xl"
          style={{ backgroundColor: config.color }}
        />
        <h1 className="relative font-display text-2xl font-bold tracking-tight leading-tight">{circuit.name}</h1>
        <div className="relative flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{circuit.location}, {circuit.country}</span>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
            >
              <ExternalLink className="w-3 h-3" />
              {t("viewOnMap")}
            </a>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6">
      {/* ── Circuit Layout Image ── */}
      {layoutUrl && <CircuitLayoutImage src={layoutUrl} alt={circuit.name} />}

      {/* ── Pist İstatistikleri ── */}
      {specs && (
        <section className="space-y-2">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {t("specifications")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label={t("length")} value={`${specs.lengthKm} km`} />
            <StatCard label={t("corners")} value={specs.corners} />
            <StatCard label={t("firstGrandPrix")} value={specs.firstGrandPrix ?? "—"} />
            <StatCard label={t("lapCount")} value={totalLaps ?? "—"} />
          </div>
          {specs.raceDistanceKm && (
            <p className="text-xs text-muted-foreground text-right">
              {t("raceDistance", { distance: specs.raceDistanceKm.toFixed(1) })}
            </p>
          )}
          {specs.fastestLap && (
            <p className="text-xs text-muted-foreground text-right font-mono">
              {t("lapRecord", {
                time: specs.fastestLap.time,
                driver: specs.fastestLap.driver,
                year: specs.fastestLap.year,
              })}
            </p>
          )}
        </section>
      )}

      {/* ── Pist Tarihçesi ── */}
      {circuitHistory && (
        <CircuitHistoryCard
          tr={circuitHistory.tr}
          en={circuitHistory.en}
          links={circuitHistory.links}
          initialLocale={locale}
          color={config.color}
        />
      )}

      {/* ── Bu Sezonun / Son Yarışın En İyileri ── */}
      {(fastestLapResult || raceWinner) && (
        <section className="space-y-2">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {latestCompleted.raceYear === currentYear
              ? t("thisSeason", { year: currentYear })
              : t("latestRace", { year: latestCompleted.raceYear })}
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {raceWinner && (
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 text-sm">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{t("winner")}</span>
                <span className="font-medium flex-1 truncate">{raceWinner.driverName}</span>
                <span className="text-xs text-muted-foreground truncate shrink-0">{raceWinner.team}</span>
              </div>
            )}
            {fastestLapResult && (
              <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="text-xs text-muted-foreground w-20 shrink-0 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  {t("fastestLap")}
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
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {t("upcoming")}
          </h2>
          {upcomingRaces.map((race) => {
            const raceSession = race.sessions.find((s) => s.type === "race");
            return (
              <Link key={`${race.raceYear}-${race.round}`} href={`/${slug}/races/${race.round}?year=${race.raceYear}`}>
                <div className="rounded-lg bg-card border border-border p-4 space-y-2 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{race.name}</p>
                    {race.round < 900 && (
                      <Badge variant="outline" className="text-xs">{t("raceNumber", { round: race.round })}</Badge>
                    )}
                  </div>
                  {raceSession && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(raceSession.date).toLocaleDateString(dateLocale, {
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

      {/* ── İptal Edilen Yarışlar ── */}
      {cancelledRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {raceStatusT("cancelled")}
          </h2>
          {cancelledRaces.map((race) => {
            const raceSession = race.sessions.find((s) => s.type === "race");
            return (
              <div key={`${race.raceYear}-${race.round}`} className="rounded-lg bg-card border border-border p-4 space-y-2 opacity-60">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{race.name}</p>
                  <Badge variant="outline" className="text-xs">{raceStatusT("cancelled")}</Badge>
                </div>
                {raceSession && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(raceSession.date).toLocaleDateString(dateLocale, {
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

      {/* ── Geçmiş Yarışlar ── */}
      {completedRaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
            {t("pastRaces")}
          </h2>
          {completedRaces.map((race) => {
            const winner = race.results?.[0];
            return (
              <Link key={`${race.raceYear}-${race.round}`} href={`/${slug}/races/${race.round}?year=${race.raceYear}`}>
                <div className="rounded-lg bg-card border border-border p-4 space-y-2 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{race.name}</p>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs text-muted-foreground">{race.raceYear}</span>
                      {race.round < 900 && (
                        <Badge variant="secondary" className="text-xs">{t("raceNumber", { round: race.round })}</Badge>
                      )}
                    </span>
                  </div>
                  {winner && (
                    <p className="text-xs text-muted-foreground">
                      {t("winnerLabel")} <span className="text-foreground font-medium">{winner.driverName}</span>
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
    </div>
  );
}
