import type { SeriesAdapter } from "@/types/series";
import {
  fetchWECSchedule,
  fetchWECStandings,
  fetchWECDrivers,
  fetchWECCircuits,
} from "./wec-api";

export const wecAdapter: SeriesAdapter = {
  slug: "wec",
  name: "FIA WEC / Le Mans",
  fetchSchedule: (season) => fetchWECSchedule(season),
  fetchStandings: (season, type) => fetchWECStandings(season, type),
  fetchDrivers: (season) => fetchWECDrivers(season),
  fetchCircuits: (season) => fetchWECCircuits(season),
};
