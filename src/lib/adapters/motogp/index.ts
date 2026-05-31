import type { SeriesAdapter } from "@/types/series";
import { createMotoGPFetchers } from "./motogp-api";

const { fetchSchedule, fetchStandings, fetchRiders, fetchCircuits } =
  createMotoGPFetchers("MotoGP", "MotoGP");

export const motogpAdapter: SeriesAdapter = {
  slug: "motogp",
  name: "MotoGP",
  fetchSchedule: (season) => fetchSchedule(season),
  fetchStandings: (season, type) => fetchStandings(season, type),
  fetchDrivers: (season) => fetchRiders(season),
  fetchCircuits: (season) => fetchCircuits(season),
};
