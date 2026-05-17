export type RaceStatus = "upcoming" | "live" | "completed" | "cancelled";

export type SessionType =
  | "practice1"
  | "practice2"
  | "practice3"
  | "qualifying"
  | "sprintQuali"
  | "sprint"
  | "race";

export interface RaceSession {
  type: SessionType;
  date: string;
}

export interface RaceResult {
  position: number;
  driverId: string;
  driverName: string;
  team: string;
  time?: string;
  gap?: string;
  points: number;
  status: string;
}

export interface Race {
  round: number;
  name: string;
  circuitId: string;
  circuitName: string;
  location: string;
  country: string;
  date: string;
  sessions: RaceSession[];
  status: RaceStatus;
  results?: RaceResult[];
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  code?: string;
  number?: number;
  nationality: string;
  team?: string;
  teamId?: string;
  image?: string;
}

export interface Team {
  id: string;
  name: string;
  nationality?: string;
}

export interface Circuit {
  id: string;
  name: string;
  location: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Standing {
  position: number;
  points: number;
  wins: number;
  driver?: Driver;
  team?: Team;
}

export type StandingType = "driver" | "team";

export interface SeriesAdapter {
  slug: string;
  name: string;
  fetchSchedule: (season: number) => Promise<Race[]>;
  fetchStandings: (season: number, type: StandingType) => Promise<Standing[]>;
  fetchDrivers: (season: number) => Promise<Driver[]>;
  fetchCircuits: (season: number) => Promise<Circuit[]>;
}
