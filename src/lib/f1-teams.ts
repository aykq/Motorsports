export interface F1TeamConfig {
  constructorId: string;
  name: string;
  fullName: string;
  short: string;
  color: string;
  /** WCAG-safe variant of `color` for readable text (car numbers, headings). Backgrounds/borders/glows should keep using `color`. */
  textColor: string;
  logo?: string;
}

export const F1_TEAMS: F1TeamConfig[] = [
  {
    constructorId: "red_bull",
    name: "Red Bull Racing",
    fullName: "Oracle Red Bull Racing",
    short: "RBR",
    color: "#3671C6",
    textColor: "var(--team-red-bull)",
    logo: "/f1/teams/red-bull.webp",
  },
  {
    constructorId: "ferrari",
    name: "Ferrari",
    fullName: "Scuderia Ferrari HP",
    short: "FER",
    color: "#E8002D",
    textColor: "var(--team-ferrari)",
    logo: "/f1/teams/ferrari.webp",
  },
  {
    constructorId: "mercedes",
    name: "Mercedes",
    fullName: "Mercedes-AMG PETRONAS F1 Team",
    short: "MER",
    color: "#27F4D2",
    textColor: "var(--team-mercedes)",
    logo: "/f1/teams/mercedes.webp",
  },
  {
    constructorId: "mclaren",
    name: "McLaren",
    fullName: "McLaren Formula 1 Team",
    short: "MCL",
    color: "#FF8000",
    textColor: "var(--team-mclaren)",
    logo: "/f1/teams/mclaren.webp",
  },
  {
    constructorId: "aston_martin",
    name: "Aston Martin",
    fullName: "Aston Martin Aramco F1 Team",
    short: "AMR",
    color: "#229971",
    textColor: "var(--team-aston-martin)",
    logo: "/f1/teams/aston-martin.webp",
  },
  {
    constructorId: "alpine",
    name: "Alpine",
    fullName: "BWT Alpine F1 Team",
    short: "ALP",
    color: "#FF87BC",
    textColor: "var(--team-alpine)",
    logo: "/f1/teams/alpine.webp",
  },
  {
    constructorId: "haas",
    name: "Haas",
    fullName: "MoneyGram Haas F1 Team",
    short: "HAS",
    color: "#B6BABD",
    textColor: "var(--team-haas)",
    logo: "/f1/teams/haas.webp",
  },
  {
    constructorId: "williams",
    name: "Williams",
    fullName: "Williams Racing",
    short: "WIL",
    color: "#64C4FF",
    textColor: "var(--team-williams)",
    logo: "/f1/teams/williams.webp",
  },
  {
    constructorId: "audi",
    name: "Audi",
    fullName: "Audi Formula 1 Team",
    short: "AUD",
    color: "#BB0000",
    textColor: "var(--team-audi)",
    logo: "/f1/teams/audi.webp",
  },
  {
    constructorId: "rb",
    name: "Racing Bulls",
    fullName: "Visa Cash App RB Formula One Team",
    short: "RB",
    color: "#6692FF",
    textColor: "var(--team-rb)",
    logo: "/f1/teams/racing-bulls.webp",
  },
  {
    constructorId: "cadillac",
    name: "Cadillac",
    fullName: "Cadillac Formula 1 Team",
    short: "CAD",
    color: "#1C3F94",
    textColor: "var(--team-cadillac)",
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
