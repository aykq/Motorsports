import { useQuery } from "@tanstack/react-query";
import type { Race, Standing, Driver } from "@/types/series";

interface SeriesData {
  slug: string;
  season: number;
  schedule: Race[];
  standings: { driver: Standing[]; team: Standing[] };
  drivers: Driver[];
  fresh: boolean;
}

async function fetchSeries(slug: string, season?: number): Promise<SeriesData> {
  const url = `/api/series/${slug}${season ? `?season=${season}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch series: ${slug}`);
  return res.json();
}

export function useSeries(slug: string, season?: number) {
  return useQuery({
    queryKey: ["series", slug, season],
    queryFn: () => fetchSeries(slug, season),
    staleTime: 5 * 60 * 1000,
  });
}
