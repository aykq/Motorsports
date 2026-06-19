export type SessionTypeId =
  | "practice1" | "practice2" | "practice3"
  | "sprintQuali" | "sprint" | "qualifying" | "race";

export interface SessionTypeConfig {
  id: SessionTypeId;
  labelTr: string;
  labelEn: string;
  icon: string;
}

export const SESSION_TYPE_CONFIGS: SessionTypeConfig[] = [
  { id: "practice1",   labelTr: "1. Antrenman",       labelEn: "Practice 1",           icon: "🔧" },
  { id: "practice2",   labelTr: "2. Antrenman",       labelEn: "Practice 2",           icon: "🔧" },
  { id: "practice3",   labelTr: "3. Antrenman",       labelEn: "Practice 3",           icon: "🔧" },
  { id: "sprintQuali", labelTr: "Sprint Sıralama",    labelEn: "Sprint Qualifying",    icon: "⏱️" },
  { id: "sprint",      labelTr: "Sprint Yarışı",      labelEn: "Sprint Race",          icon: "💨" },
  { id: "qualifying",  labelTr: "Sıralama Turları",   labelEn: "Qualifying",           icon: "⏱️" },
  { id: "race",        labelTr: "Yarış",              labelEn: "Race",                 icon: "🏁" },
];

export const SESSION_TYPES_BY_SERIES: Record<string, SessionTypeId[]> = {
  f1:           ["practice1", "practice2", "practice3", "sprintQuali", "sprint", "qualifying", "race"],
  wec:          ["practice1", "practice2", "practice3", "qualifying", "race"],
  motogp:       ["practice1", "practice2", "qualifying", "sprint", "race"],
  moto2:        ["practice1", "practice2", "qualifying", "race"],
  moto3:        ["practice1", "practice2", "qualifying", "race"],
  gt3:          ["practice1", "qualifying", "race"],
  gt4:          ["practice1", "qualifying", "sprint", "race"],
  "carrera-cup":["practice1", "qualifying", "race"],
};

// Geriye dönük uyumluluk: preferences yoksa bu tiplere bildirim gider
export const DEFAULT_SESSION_TYPES: SessionTypeId[] = ["race", "qualifying", "sprint", "sprintQuali"];

export function getSessionTypesForSeries(seriesSlug: string): SessionTypeId[] {
  return SESSION_TYPES_BY_SERIES[seriesSlug] ?? ["qualifying", "race"];
}

export function getSessionTypeConfig(id: string): SessionTypeConfig | undefined {
  return SESSION_TYPE_CONFIGS.find((c) => c.id === id);
}
