import type { SeriesAdapter } from "@/types/series";
import {
  fetchCarreraSchedule,
  fetchCarreraStandings,
  fetchCarreraDrivers,
  fetchCarreraCircuits,
} from "./carrera-scraper";

export const carreraCupAdapter: SeriesAdapter = {
  slug: "carrera-cup",
  name: "Porsche Carrera Cup Deutschland",
  fetchSchedule: (season) => fetchCarreraSchedule(season),
  fetchStandings: (season, type) => fetchCarreraStandings(season, type),
  fetchDrivers: (season) => fetchCarreraDrivers(season),
  fetchCircuits: (season) => fetchCarreraCircuits(season),
};
