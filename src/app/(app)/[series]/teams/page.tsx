import { getCachedStandings, getCachedDrivers } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { BackButton } from "@/components/layout/BackButton";
import { getF1Team } from "@/lib/f1-teams";
import { TeamLogo } from "@/components/series/TeamLogo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { Driver } from "@/types/series";

interface Props {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("teamsPage");
  return { title: `${t("title")} — ${config?.name ?? slug.toUpperCase()}` };
}

export default async function TeamsPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const t = await getTranslations("teamsPage");
  const year = new Date().getFullYear();
  const [{ standings }, { drivers }] = await Promise.all([
    getCachedStandings(slug, year, "team"),
    getCachedDrivers(slug),
  ]);

  const driversByTeam = drivers.reduce<Record<string, Driver[]>>((acc, d) => {
    const key = d.teamId ?? "";
    if (key) {
      acc[key] = acc[key] ?? [];
      acc[key].push(d);
    }
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-1">
        <BackButton fallbackHref={`/${slug}`} label={config.shortName} />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight leading-none">{config.name} — {t("title")}</h1>
        <p className="text-xs text-muted-foreground font-mono">{t("season", { year })}</p>
      </div>

      <div className="space-y-2">
        {standings.map((s) => {
          const teamId = s.team?.id;
          const f1Team = slug === "f1" ? getF1Team(teamId) : undefined;
          const teamDrivers = teamId ? (driversByTeam[teamId] ?? []) : [];
          const teamColor = f1Team?.color ?? config.color;

          return (
            <Link key={s.position} href={`/${slug}/teams/${teamId}`}>
              <div className="relative rounded-lg bg-card border border-border p-4 hover:bg-accent/50 transition-colors flex items-center gap-4 overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                  style={{ backgroundColor: teamColor }}
                />

                <span className="font-mono text-lg font-bold text-muted-foreground w-6 text-right shrink-0 ml-2">
                  {s.position}
                </span>

                <TeamLogo
                  src={f1Team?.logo}
                  alt={s.team?.name ?? ""}
                  fallbackColor={teamColor}
                  fallbackText={f1Team?.short ?? s.team?.name?.[0] ?? "?"}
                  className="w-10 h-10 shrink-0"
                  fallbackClassName="w-10 h-10 rounded text-xs shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.team?.name}</p>
                  {teamDrivers.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {teamDrivers.map((d) => d.code ?? d.lastName).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-xl tabular-nums">{s.points}</p>
                  <p className="font-display text-[10px] text-muted-foreground uppercase tracking-wide">{t("points")}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {standings.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{t("noData")}</p>
        </div>
      )}
    </div>
  );
}
