import { getCachedDrivers } from "@/lib/cache";
import { getSeriesConfig } from "@/lib/series-config";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { Driver } from "@/types/series";
import { DriversContent } from "./DriversContent";

interface Props {
  params: Promise<{ series: string }>;
  searchParams: Promise<{ cat?: string; cls?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: slug } = await params;
  const config = getSeriesConfig(slug);
  const t = await getTranslations("driversPage");
  return { title: `${config?.name ?? slug} — ${t("title")}` };
}

export default async function DriversListPage({ params, searchParams }: Props) {
  const { series: slug } = await params;
  const { cat, cls } = await searchParams;
  const config = getSeriesConfig(slug);
  if (!config || !config.available) notFound();

  const subSeries = config.subSeries ?? [];

  // Fetch all categories upfront so tab switching is instant (no extra DB round-trips)
  const [mainResult, ...subResults] = await Promise.all([
    getCachedDrivers(slug),
    ...subSeries.map((s) => getCachedDrivers(s)),
  ]);

  const driversByCategory: Record<string, Driver[]> = {
    [slug]: mainResult.drivers,
    ...Object.fromEntries(subSeries.map((s, i) => [s, subResults[i].drivers])),
  };

  return (
    <DriversContent
      slug={slug}
      config={config}
      driversByCategory={driversByCategory}
      subSeries={subSeries}
      initialCat={cat}
      initialCls={cls}
    />
  );
}
