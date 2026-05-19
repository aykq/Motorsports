import { getCachedStandings } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { getF1Team, getF1TeamByName } from "@/lib/f1-teams";
import { TeamLogo } from "@/components/series/TeamLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  return { title: `${config?.name ?? slug} — Puan Tablosu` };
}

function TeamBadge({ teamId, teamName }: { teamId?: string; teamName?: string }) {
  const team = getF1Team(teamId) ?? getF1TeamByName(teamName);
  if (!team) return null;
  return (
    <TeamLogo
      src={team.logo}
      alt={team.name}
      fallbackColor={team.color}
      fallbackText={team.short.slice(0, 3)}
      className="h-4 w-auto shrink-0"
      fallbackClassName="w-7 h-4 rounded text-[9px] shrink-0"
    />
  );
}

export default async function StandingsPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const [{ standings: driverStandings }, { standings: teamStandings }] = await Promise.all([
    getCachedStandings(slug, year, "driver"),
    getCachedStandings(slug, year, "team"),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{config.name} — Puan Tablosu</h1>
        <p className="text-xs text-muted-foreground mt-1">{year} Sezonu</p>
      </div>

      <Tabs defaultValue="driver">
        <TabsList className="w-full">
          <TabsTrigger value="driver" className="flex-1">Sürücüler</TabsTrigger>
          <TabsTrigger value="team" className="flex-1">Takımlar</TabsTrigger>
        </TabsList>

        <TabsContent value="driver" className="mt-4 space-y-1.5">
          {driverStandings.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Henüz puan verisi yok.</p>
          ) : (
            driverStandings.map((s) => (
              <div
                key={s.position}
                className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border"
              >
                <span
                  className="w-7 text-right font-bold text-sm shrink-0"
                  style={s.position <= 3 ? { color: ["#fbbf24", "#9ca3af", "#cd7f32"][s.position - 1] } : {}}
                >
                  {s.position}
                </span>
                {s.driver?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.driver.image}
                    alt={s.driver.lastName}
                    className="w-8 h-8 rounded-full object-cover bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {s.driver?.code ?? s.driver?.lastName?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {s.driver?.firstName} {s.driver?.lastName}
                    {s.driver?.code && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">{s.driver.code}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TeamBadge teamId={s.driver?.teamId} teamName={s.driver?.team} />
                    <p className="text-xs text-muted-foreground truncate">{s.driver?.team}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{s.points} pts</p>
                  {s.wins > 0 && (
                    <p className="text-xs text-muted-foreground">{s.wins} galibiyet</p>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-1.5">
          {teamStandings.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Henüz puan verisi yok.</p>
          ) : (
            teamStandings.map((s) => {
              const team = getF1Team(s.team?.id) ?? getF1TeamByName(s.team?.name);
              return (
                <div
                  key={s.position}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border"
                >
                  <span
                    className="w-7 text-right font-bold text-sm shrink-0"
                    style={s.position <= 3 ? { color: ["#fbbf24", "#9ca3af", "#cd7f32"][s.position - 1] } : {}}
                  >
                    {s.position}
                  </span>
                  <TeamLogo
                    src={team?.logo}
                    alt={s.team?.name ?? ""}
                    fallbackColor={team?.color ?? "#52525b"}
                    fallbackText={team?.short ?? s.team?.name?.slice(0, 3).toUpperCase() ?? "?"}
                    className="h-8 w-10 shrink-0"
                    fallbackClassName="w-10 h-8 rounded-lg text-[10px] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.team?.name}</p>
                    {s.team?.nationality && (
                      <p className="text-xs text-muted-foreground">{s.team.nationality}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="font-bold">{s.points} pts</Badge>
                    {s.wins > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.wins} galibiyet</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
