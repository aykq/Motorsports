export interface SeriesConfig {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  available: boolean;
}

export const SERIES_LIST: SeriesConfig[] = [
  { slug: "f1", name: "Formula 1", shortName: "F1", color: "#e11d48", available: true },
  { slug: "wec", name: "FIA WEC / Le Mans", shortName: "WEC", color: "#0ea5e9", available: false },
  { slug: "motogp", name: "MotoGP", shortName: "MotoGP", color: "#f97316", available: false },
  { slug: "gt3", name: "GT World Challenge", shortName: "GT3", color: "#22c55e", available: false },
  { slug: "carrera-cup", name: "Porsche Carrera Cup", shortName: "Carrera", color: "#a855f7", available: false },
];

export function getSeriesConfig(slug: string): SeriesConfig | undefined {
  return SERIES_LIST.find((s) => s.slug === slug);
}
