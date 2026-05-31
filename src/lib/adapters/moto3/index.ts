import type { SeriesAdapter } from "@/types/series";
import { createMotoGPFetchers } from "../motogp/motogp-api";

const { fetchSchedule, fetchStandings, fetchRiders, fetchCircuits } =
  createMotoGPFetchers("Moto3", "Moto3");

export const moto3Adapter: SeriesAdapter = {
  slug: "moto3",
  name: "Moto3",
  fetchSchedule: (season) => fetchSchedule(season),
  fetchStandings: (season, type) => fetchStandings(season, type),
  fetchDrivers: (season) => fetchRiders(season),
  fetchCircuits: (season) => fetchCircuits(season),
};
