import type { SeriesAdapter } from "@/types/series";
import {
  fetchGT3Schedule,
  fetchGT3Standings,
  fetchGT3Drivers,
  fetchGT3Circuits,
} from "./gt3-scraper";

export const gt3Adapter: SeriesAdapter = {
  slug: "gt3",
  name: "GT World Challenge Europe",
  fetchSchedule: (season) => fetchGT3Schedule(season),
  fetchStandings: (season, type) => fetchGT3Standings(season, type),
  fetchDrivers: (season) => fetchGT3Drivers(season),
  fetchCircuits: (season) => fetchGT3Circuits(season),
};
