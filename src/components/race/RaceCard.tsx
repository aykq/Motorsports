"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Race } from "@/types/series";
import type { SeriesConfig } from "@/lib/series-config";
import { MapPin, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

interface RaceCardProps {
  race: Race;
  series: SeriesConfig;
  compact?: boolean;
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

export function RaceCard({ race, series, compact = false }: RaceCardProps) {
  const router = useRouter();
  const tStatus = useTranslations("raceStatus");
  const tRace = useTranslations("racePage");
  const locale = useLocale();
  const raceSession = race.sessions.find((s) => s.type === "race");
  const isLive = race.status === "live";
  const isCompleted = race.status === "completed";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-colors hover:bg-accent/50 cursor-pointer",
        isLive && "ring-1 ring-rose-500"
      )}
      onClick={() => router.push(`/${series.slug}/races/${race.round}`)}
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: series.color }} />
      <CardContent className="p-4 pl-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-display text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: series.color + "22", color: series.color }}
            >
              {series.shortName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{tRace("round", { round: race.round })}</span>
          </div>
          <Badge
            variant={isLive ? "destructive" : isCompleted ? "secondary" : "outline"}
            className={cn("shrink-0 font-display uppercase tracking-wider text-[11px]", isLive && "animate-pulse")}
          >
            {tStatus(race.status)}
          </Badge>
        </div>

        <div>
          <p className="font-display text-base font-bold tracking-tight leading-none">{race.name}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <Link
              href={`/${series.slug}/circuits/${race.circuitId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {race.circuitName}
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <span>{race.location}, {race.country}</span>
          </div>
        </div>

        {raceSession && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{formatDate(raceSession.date, locale)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatTime(raceSession.date, locale)}</span>
          </div>
        )}

        {isCompleted && race.results && race.results.length > 0 && !compact && (
          <div className="space-y-1 pt-2 border-t border-border">
            {race.results.slice(0, 3).map((result) => (
              <div key={result.position} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-mono font-bold text-right shrink-0" style={result.position === 1 ? { color: "#f5c518" } : { color: "var(--muted-foreground)" }}>
                  {result.position}
                </span>
                <Flag className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{result.driverName}</span>
                <span className="text-muted-foreground truncate">{result.team}</span>
                {result.time && (
                  <span className="ml-auto text-muted-foreground shrink-0 font-mono">
                    {result.time}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
