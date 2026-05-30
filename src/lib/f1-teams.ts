export interface F1TeamConfig {
  constructorId: string;
  name: string;
  short: string;
  color: string;
  logo?: string;
}

export const F1_TEAMS: F1TeamConfig[] = [
  {
    constructorId: "red_bull",
    name: "Red Bull Racing",
    short: "RBR",
    color: "#3671C6",
    logo: "/f1/teams/red-bull.webp",
  },
  {
    constructorId: "ferrari",
    name: "Ferrari",
    short: "FER",
    color: "#E8002D",
    logo: "/f1/teams/ferrari.webp",
  },
  {
    constructorId: "mercedes",
    name: "Mercedes",
    short: "MER",
    color: "#27F4D2",
    logo: "/f1/teams/mercedes.webp",
  },
  {
    constructorId: "mclaren",
    name: "McLaren",
    short: "MCL",
    color: "#FF8000",
    logo: "/f1/teams/mclaren.webp",
  },
  {
    constructorId: "aston_martin",
    name: "Aston Martin",
    short: "AMR",
    color: "#229971",
    logo: "/f1/teams/aston-martin.webp",
  },
  {
    constructorId: "alpine",
    name: "Alpine",
    short: "ALP",
    color: "#FF87BC",
    logo: "/f1/teams/alpine.webp",
  },
  {
    constructorId: "haas",
    name: "Haas",
    short: "HAS",
    color: "#B6BABD",
    logo: "/f1/teams/haas.webp",
  },
  {
    constructorId: "williams",
    name: "Williams",
    short: "WIL",
    color: "#64C4FF",
    logo: "/f1/teams/williams.webp",
  },
  {
    constructorId: "sauber",
    name: "Audi",
    short: "AUD",
    color: "#52E252",
    logo: "/f1/teams/audi.webp",
  },
  {
    constructorId: "rb",
    name: "Racing Bulls",
    short: "RB",
    color: "#6692FF",
    logo: "/f1/teams/racing-bulls.webp",
  },
  {
    constructorId: "cadillac",
    name: "Cadillac",
    short: "CAD",
    color: "#CC0000",
    logo: "/f1/teams/cadillac.webp",
  },
];

const TEAM_MAP = new Map(F1_TEAMS.map((t) => [t.constructorId, t]));

export function getF1Team(constructorId: string | undefined): F1TeamConfig | undefined {
  if (!constructorId) return undefined;
  return TEAM_MAP.get(constructorId);
}

export function getF1TeamByName(name: string | undefined): F1TeamConfig | undefined {
  if (!name) return undefined;
  return F1_TEAMS.find(
    (t) => t.name.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(t.short.toLowerCase())
  );
}
