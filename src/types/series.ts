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
  driverNumber?: number;
  team: string;
  time?: string;
  gap?: string;
  points: number;
  status: string;
  fastestLap?: boolean;
  fastestLapTime?: string;
  gridPosition?: number;
  laps?: number;
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
  circuitLat?: number;
  circuitLng?: number;
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

// ─── Race Detail ─────────────────────────────────────────────────────────────

export interface PitStop {
  driverId: string;
  driverName: string;
  lap: number;
  stop: number;
  duration: string;
}

export type TireCompound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | "UNKNOWN";

export interface TireStint {
  driverNumber: number;
  compound: TireCompound;
  lapStart: number;
  lapEnd: number;
  tyreAgeAtStart: number;
}

export interface RaceControlEvent {
  lap?: number;
  category: string;
  message: string;
  flag?: string;
  driverNumber?: number;
  driverAcronym?: string;
}

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  windSpeed: number;
  weatherCode: number;
}

export interface RaceDetail {
  pitStops: PitStop[];
  tireStints: TireStint[];
  raceControl: RaceControlEvent[];
  driverStandingsAfter: Standing[];
  teamStandingsAfter: Standing[];
  weather: WeatherDay[];
}
