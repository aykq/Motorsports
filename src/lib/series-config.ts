export interface SeriesConfig {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  available: boolean;
  logo?: string;
  hidden?: boolean;
  subSeries?: string[];
  category?: string;
}

export const SERIES_LIST: SeriesConfig[] = [
  { slug: "f1", name: "Formula 1", shortName: "F1", color: "#e11d48", available: true, logo: "/series/f1.svg" },
  { slug: "wec", name: "FIA WEC / Le Mans", shortName: "WEC", color: "#0ea5e9", available: true, logo: "/series/wec.svg" },
  { slug: "motogp", name: "MotoGP", shortName: "MotoGP", color: "#f97316", available: true, logo: "/series/motogp.svg", subSeries: ["moto2", "moto3"] },
  { slug: "moto2", name: "Moto2", shortName: "Moto2", color: "#fb923c", available: true, logo: "/series/moto2.svg", hidden: true },
  { slug: "moto3", name: "Moto3", shortName: "Moto3", color: "#fbbf24", available: true, logo: "/series/moto3.svg", hidden: true },
  { slug: "gt3", name: "GT World Challenge Europe", shortName: "GT3", color: "#22c55e", available: true, logo: "/series/gt3.svg", category: "GT3" },
  { slug: "gt4", name: "GT4 European Series", shortName: "GT4", color: "#eab308", available: true, logo: "/series/gt4.svg", category: "GT4" },
  { slug: "carrera-cup", name: "Porsche Carrera Cup", shortName: "Carrera", color: "#a855f7", available: true, logo: "/series/carrera-cup.svg" },
];

export function getSeriesConfig(slug: string): SeriesConfig | undefined {
  return SERIES_LIST.find((s) => s.slug === slug);
}
