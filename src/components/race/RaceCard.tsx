import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Race } from "@/types/series";
import type { SeriesConfig } from "@/lib/series-config";
import { MapPin, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RaceCardProps {
  race: Race;
  series: SeriesConfig;
  compact?: boolean;
}

const STATUS_LABELS: Record<Race["status"], string> = {
  upcoming: "Yaklaşan",
  live: "Canlı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const SESSION_LABELS: Record<string, string> = {
  practice1: "1. Antrenman",
  practice2: "2. Antrenman",
  practice3: "3. Antrenman",
  qualifying: "Sıralama",
  sprintQuali: "Sprint Sıralama",
  sprint: "Sprint",
  race: "Yarış",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

export function RaceCard({ race, series, compact = false }: RaceCardProps) {
  const raceSession = race.sessions.find((s) => s.type === "race");
  const isLive = race.status === "live";
  const isCompleted = race.status === "completed";

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors hover:bg-accent/50",
        isLive && "ring-1 ring-rose-500"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="text-xs font-bold"
              style={{ backgroundColor: series.color + "22", color: series.color }}
            >
              {series.shortName}
            </Badge>
            <span className="text-xs text-muted-foreground">Tur {race.round}</span>
          </div>
          <Badge
            variant={isLive ? "destructive" : isCompleted ? "secondary" : "outline"}
            className={cn("shrink-0 text-xs", isLive && "animate-pulse")}
          >
            {STATUS_LABELS[race.status]}
          </Badge>
        </div>

        <div>
          <Link
            href={`/${series.slug}/races/${race.round}`}
            className="font-semibold text-sm leading-tight hover:underline hover:text-foreground transition-colors"
          >
            {race.name}
          </Link>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <Link
              href={`/${series.slug}/circuits/${race.circuitId}`}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {race.circuitName}
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <span>{race.location}, {race.country}</span>
          </div>
        </div>

        {raceSession && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{formatDate(raceSession.date)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatTime(raceSession.date)}</span>
          </div>
        )}

        {isCompleted && race.results && race.results.length > 0 && !compact && (
          <div className="space-y-1 pt-1 border-t border-border">
            {race.results.slice(0, 3).map((result) => (
              <div key={result.position} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground text-right shrink-0">
                  {result.position}.
                </span>
                <Flag className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{result.driverName}</span>
                <span className="text-muted-foreground truncate">{result.team}</span>
                {result.time && (
                  <span className="ml-auto text-muted-foreground shrink-0">
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
