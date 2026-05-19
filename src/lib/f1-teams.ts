export interface F1TeamConfig {
  constructorId: string;
  name: string;
  short: string;
  color: string;
  logo?: string;
}

const CDN = "https://raw.githubusercontent.com/slowlydev/f1-dash/main/dashboard/public/team-logos";

export const F1_TEAMS: F1TeamConfig[] = [
  {
    constructorId: "red_bull",
    name: "Red Bull Racing",
    short: "RBR",
    color: "#3671C6",
    logo: `${CDN}/red-bull-racing.svg`,
  },
  {
    constructorId: "ferrari",
    name: "Ferrari",
    short: "FER",
    color: "#E8002D",
    logo: `${CDN}/ferrari.svg`,
  },
  {
    constructorId: "mercedes",
    name: "Mercedes",
    short: "MER",
    color: "#27F4D2",
    logo: `${CDN}/mercedes.svg`,
  },
  {
    constructorId: "mclaren",
    name: "McLaren",
    short: "MCL",
    color: "#FF8000",
    logo: `${CDN}/mclaren.svg`,
  },
  {
    constructorId: "aston_martin",
    name: "Aston Martin",
    short: "AMR",
    color: "#229971",
    logo: `${CDN}/aston-martin.svg`,
  },
  {
    constructorId: "alpine",
    name: "Alpine",
    short: "ALP",
    color: "#FF87BC",
    logo: `${CDN}/alpine.svg`,
  },
  {
    constructorId: "haas",
    name: "Haas",
    short: "HAS",
    color: "#B6BABD",
    logo: `${CDN}/haas-f1-team.svg`,
  },
  {
    constructorId: "williams",
    name: "Williams",
    short: "WIL",
    color: "#64C4FF",
    logo: `${CDN}/williams.svg`,
  },
  {
    constructorId: "sauber",
    name: "Audi (Sauber)",
    short: "SAU",
    color: "#52E252",
    logo: `${CDN}/kick-sauber.svg`,
  },
  {
    constructorId: "rb",
    name: "Racing Bulls",
    short: "RB",
    color: "#6692FF",
    logo: `${CDN}/racing-bulls.svg`,
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
