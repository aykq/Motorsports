import type {
  SeriesAdapter,
  Race,
  Standing,
  Driver,
  Circuit,
  StandingType,
} from "@/types/series";

export abstract class BaseAdapter implements SeriesAdapter {
  abstract readonly slug: string;
  abstract readonly name: string;
  abstract fetchSchedule(season: number): Promise<Race[]>;
  abstract fetchStandings(season: number, type: StandingType): Promise<Standing[]>;
  abstract fetchDrivers(season: number): Promise<Driver[]>;
  abstract fetchCircuits(season: number): Promise<Circuit[]>;
}
