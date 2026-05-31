import type { SeriesAdapter } from "@/types/series";
import { createMotoGPFetchers } from "../motogp/motogp-api";

const { fetchSchedule, fetchStandings, fetchRiders, fetchCircuits } =
  createMotoGPFetchers("Moto2", "Moto2");

export const moto2Adapter: SeriesAdapter = {
  slug: "moto2",
  name: "Moto2",
  fetchSchedule: (season) => fetchSchedule(season),
  fetchStandings: (season, type) => fetchStandings(season, type),
  fetchDrivers: (season) => fetchRiders(season),
  fetchCircuits: (season) => fetchCircuits(season),
};
