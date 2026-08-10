import { getCachedSchedule, getCachedStandings, getCachedDrivers, getCachedNews } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getCircuitPresentation } from "@/lib/circuit-data";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { BackButton } from "@/components/layout/BackButton";
import { SeriesSubNav } from "@/components/series/SeriesSubNav";
import { StandingsTable } from "@/components/series/StandingsTable";
import { DriverCard } from "@/components/series/DriverCard";
import { NextRaceHeroCard, formatRaceWeekend } from "@/components/series/NextRaceHeroCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Race, Standing } from "@/types/series";

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

  const t = await getTranslations("seriesPage");
  const locale = await getLocale();

  const year = new Date().getFullYear();
  const [{ races }, { standings: driverStandings }, { standings: teamStandings }, { drivers }, news] = await Promise.all([
    getCachedSchedule(slug, year),
    getCachedStandings(slug, year, "driver"),
    getCachedStandings(slug, year, "team"),
    getCachedDrivers(slug),
    getCachedNews(slug, 5),
  ]);

  const nextRace = races
    .filter((r) => r.status === "upcoming" || r.status === "live")
    .sort((a, b) => getRaceDate(a).getTime() - getRaceDate(b).getTime())[0] ?? null;

  const standingByDriverId = new Map<string, Standing>(
    driverStandings.map((s) => [s.driver?.id ?? "", s])
  );

  const sortedDrivers = [...drivers].sort((a, b) => {
    const posA = standingByDriverId.get(a.id)?.position ?? 999;
    const posB = standingByDriverId.get(b.id)?.position ?? 999;
    return posA - posB;
  });

  const top5Drivers = driverStandings.slice(0, 5);
  const top5Teams = teamStandings.slice(0, 5);

  const { circuitPhotoUrl, circuitCoords } = getCircuitPresentation(slug, nextRace);

  return (
    <div className="pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-4 pt-4">

        {/* Header */}
        <div className="flex items-center gap-1 -ml-2">
          <BackButton fallbackHref="/series" label="" />
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: config.color }}>{config.name}</h1>
        </div>

        <SeriesSubNav slug={slug} color={config.color} active="overview" />

        {/* Next race card */}
        {nextRace && (
          <NextRaceHeroCard
            race={nextRace}
            slug={slug}
            color={config.color}
            circuitPhotoUrl={circuitPhotoUrl}
            circuitCoords={circuitCoords}
            weekendLabel={formatRaceWeekend(nextRace, locale)}
            nextRoundLabel={t("nextRound")}
            viewDetailsLabel={t("viewDetails")}
            scheduleLabel={t("schedule")}
          />
        )}

        {/* Drivers horizontal scroll */}
        {sortedDrivers.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">{t("drivers")}</h3>
              <Link
                href={`/${slug}/drivers`}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: config.color }}
              >
                {t("viewAll")}
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-3 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
              {sortedDrivers.map((driver, i) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  seriesSlug={slug}
                  color={config.color}
                  index={i}
                  priority={i < 4}
                />
              ))}
            </div>
          </section>
        )}

        {/* Standings */}
        {(top5Drivers.length > 0 || top5Teams.length > 0) && (
          <section className="mb-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">{t("standings")}</h3>
              <Link href={`/${slug}/standings`} className="text-xs hover:opacity-70 transition-opacity" style={{ color: config.color }}>
                {t("viewAll")}
              </Link>
            </div>
            <Tabs defaultValue="driver">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="driver" className="flex-1">{t("drivers")}</TabsTrigger>
                <TabsTrigger value="team" className="flex-1">{t("teams")}</TabsTrigger>
              </TabsList>
              <TabsContent value="driver" className="mt-0">
                <StandingsTable
                  color={config.color}
                  rows={top5Drivers.map((s) => {
                    const f1Team = slug === "f1" ? getF1TeamByName(s.driver?.team) : undefined;
                    return {
                      position: s.position,
                      name: s.driver?.lastName ?? s.driver?.firstName ?? "—",
                      sub: f1Team?.fullName ?? s.driver?.team ?? "",
                      href: s.driver ? `/${slug}/drivers/${s.driver.id}` : "#",
                      points: s.points,
                    };
                  })}
                />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <StandingsTable
                  color={config.color}
                  rows={top5Teams.map((s) => {
                    const f1Team = slug === "f1"
                      ? (getF1Team(s.team?.id) ?? getF1TeamByName(s.team?.name))
                      : undefined;
                    return {
                      position: s.position,
                      name: f1Team?.fullName ?? s.team?.name ?? "—",
                      sub: "",
                      href: s.team?.id ? `/${slug}/teams/${s.team.id}` : "#",
                      points: s.points,
                    };
                  })}
                />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {races.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{t("noData")}</p>
          </div>
        )}

        {/* Latest news strip */}
        {news.length > 0 && (
          <section className="mb-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">{t("latestNews")}</h3>
              <Link href="/news" className="text-xs hover:opacity-70 transition-opacity" style={{ color: config.color }}>
                {t("viewAll")}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {news.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl overflow-hidden hover:bg-accent/30 transition-colors"
                >
                  <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: config.color }} />
                  <div className="flex-1 min-w-0 py-2.5 pr-3 flex gap-3 items-center">
                    <p className="flex-1 text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                    {item.imageUrl && (
                      <div className="shrink-0 w-14 h-10 rounded-md overflow-hidden bg-muted relative">
                        <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
