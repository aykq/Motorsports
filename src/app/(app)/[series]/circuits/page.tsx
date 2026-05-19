import { getCachedSchedule } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  return { title: `${config?.name ?? slug} — Pistler` };
}

export default async function CircuitsListPage({ params }: Props) {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const year = new Date().getFullYear();
  const { races } = await getCachedSchedule(slug, year);

  const circuits = Array.from(
    new Map(races.map((r) => [r.circuitId, r])).values()
  ).sort((a, b) => a.circuitName.localeCompare(b.circuitName));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{config.name} — Pistler</h1>
        <p className="text-xs text-muted-foreground mt-1">{circuits.length} pist</p>
      </div>

      {circuits.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">Henüz pist verisi yok.</p>
      ) : (
        <div className="space-y-1.5">
          {circuits.map((race) => (
            <Link key={race.circuitId} href={`/${slug}/circuits/${race.circuitId}`}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: config.color + "22" }}
                >
                  <MapPin className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{race.circuitName}</p>
                  <p className="text-xs text-muted-foreground">
                    {race.location}, {race.country}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Yarış {race.round}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
