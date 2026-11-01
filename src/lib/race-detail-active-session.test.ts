import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Race, QualifyingDriverResult } from "@/types/series";

const m = vi.hoisted(() => ({
  getRaceDetailRaw: vi.fn(),
  setCachedRaceDetail: vi.fn(),
  getCachedDrivers: vi.fn(async () => ({ drivers: [] })),
  getCachedSchedule: vi.fn(),
  jolpicaFetchQualifyingResults: vi.fn(),
  scrapeF1QualifyingResults: vi.fn(async (): Promise<QualifyingDriverResult[]> => []),
  findOpenF1AllSessionKeys: vi.fn(async () => new Map()),
  logError: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  getRaceDetailRaw: m.getRaceDetailRaw,
  setCachedRaceDetail: m.setCachedRaceDetail,
  getCachedDrivers: m.getCachedDrivers,
  getCachedSchedule: m.getCachedSchedule,
  getCachedRaceDetail: vi.fn(),
}));
vi.mock("@/lib/adapters/f1/jolpica", () => ({
  jolpicaFetchQualifyingResults: m.jolpicaFetchQualifyingResults,
  jolpicaFetchSprintResults: vi.fn(async () => []),
  jolpicaFetchPitStops: vi.fn(async () => []),
  jolpicaFetchRoundDriverStandings: vi.fn(async () => []),
  jolpicaFetchRoundTeamStandings: vi.fn(async () => []),
}));
vi.mock("@/lib/adapters/f1/motorsport-com-scraper", () => ({
  scrapeF1QualifyingResults: m.scrapeF1QualifyingResults,
  scrapeF1PracticeResults: vi.fn(async () => []),
  scrapeF1SprintResults: vi.fn(async () => []),
  scrapeF1RaceStints: vi.fn(async () => []),
}));
vi.mock("@/lib/adapters/f1/openf1", () => ({
  findOpenF1AllSessionKeys: m.findOpenF1AllSessionKeys,
  fetchOpenF1Stints: vi.fn(),
  fetchOpenF1RaceControl: vi.fn(),
  fetchOpenF1PracticeResults: vi.fn(),
  fetchOpenF1QualifyingResults: vi.fn(),
  fetchOpenF1SprintResults: vi.fn(),
  OpenF1NoDataError: class extends Error {},
}));
vi.mock("@/lib/weather", () => ({ fetchRaceWeather: vi.fn() }));
vi.mock("@/lib/gemini", () => ({ translateRaceControlMessages: vi.fn(async () => []) }));
vi.mock("@/lib/error-log", () => ({ logError: m.logError }));

import { syncActiveSessionData, refetchActiveWeekendSessions } from "./race-detail";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-11-01T11:00:00Z").getTime();

const race: Race = {
  round: 19,
  name: "Mexico City Grand Prix",
  circuitId: "rodriguez",
  circuitName: "Autódromo Hermanos Rodríguez",
  location: "Mexico City",
  country: "Mexico",
  date: new Date(NOW + 9 * HOUR).toISOString(),
  status: "upcoming",
  sessions: [
    { type: "qualifying", date: new Date(NOW - 14 * HOUR).toISOString() },
    { type: "race", date: new Date(NOW + 9 * HOUR).toISOString() },
  ],
} as Race;

const mscomRow: QualifyingDriverResult = {
  position: 1,
  driverId: "ryo-hirakawa",
  driverName: "R. Hirakawa",
  team: "Haas F1 Team",
  q1: "1:18.958",
};
const jolpicaRow: QualifyingDriverResult = {
  position: 1,
  driverId: "ryo_hirakawa",
  driverName: "Ryo Hirakawa",
  driverCode: "HIR",
  team: "Haas F1 Team",
  q1: "1:18.958",
};

function existingDetail() {
  return { raceControl: [], tireStints: [], qualifyingResults: [mscomRow], qualifyingComplete: false };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  m.getRaceDetailRaw.mockResolvedValue(existingDetail());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("syncActiveSessionData ignoreWindow", () => {
  it("skips a session whose window has closed by default", async () => {
    const changed = await syncActiveSessionData("f1", 2026, race);

    expect(changed).toBe(false);
    expect(m.jolpicaFetchQualifyingResults).not.toHaveBeenCalled();
    expect(m.setCachedRaceDetail).not.toHaveBeenCalled();
  });

  it("refetches a closed-window session when asked", async () => {
    m.jolpicaFetchQualifyingResults.mockResolvedValue([jolpicaRow]);

    const changed = await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    expect(changed).toBe(true);
    const saved = m.setCachedRaceDetail.mock.calls[0]![3];
    expect(saved.qualifyingResults).toEqual([jolpicaRow]);
  });

  it("keeps the stored result when every source comes back empty", async () => {
    m.jolpicaFetchQualifyingResults.mockResolvedValue([]);

    await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    expect(m.setCachedRaceDetail).not.toHaveBeenCalled();
  });

  it("does not refetch a session already marked complete", async () => {
    m.getRaceDetailRaw.mockResolvedValue({ ...existingDetail(), qualifyingComplete: true });

    const changed = await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    expect(changed).toBe(false);
    expect(m.jolpicaFetchQualifyingResults).not.toHaveBeenCalled();
  });
});

describe("Jolpica qualifying with inconsistent positions", () => {
  const ham: QualifyingDriverResult = { position: 1, driverId: "hamilton", driverName: "Lewis Hamilton", driverCode: "HAM", team: "Ferrari", q1: "1:17.341" };
  const lin: QualifyingDriverResult = { position: 2, driverId: "lindblad", driverName: "Arvid Lindblad", driverCode: "LIN", team: "Racing Bulls", q1: "1:18.210" };
  const law: QualifyingDriverResult = { position: 2, driverId: "lawson", driverName: "Liam Lawson", driverCode: "LAW", team: "Racing Bulls", q1: "1:18.100" };

  it("takes the order from motorsport.com and logs a warning", async () => {
    m.jolpicaFetchQualifyingResults.mockResolvedValue([ham, lin, law]);
    m.scrapeF1QualifyingResults.mockResolvedValue([
      { ...ham, position: 1 },
      { ...law, position: 2 },
      { ...lin, position: 3 },
    ]);

    await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    const saved = m.setCachedRaceDetail.mock.calls[0]![3];
    expect(saved.qualifyingResults.map((r: QualifyingDriverResult) => [r.position, r.driverId])).toEqual([
      [1, "hamilton"],
      [2, "lawson"],
      [3, "lindblad"],
    ]);
    expect(m.logError).toHaveBeenCalledWith(expect.objectContaining({ source: "jolpica/qualifying-order" }));
  });

  it("falls back to lap times when motorsport.com has nothing", async () => {
    m.jolpicaFetchQualifyingResults.mockResolvedValue([ham, lin, law]);
    m.scrapeF1QualifyingResults.mockResolvedValue([]);

    await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    const saved = m.setCachedRaceDetail.mock.calls[0]![3];
    expect(saved.qualifyingResults.map((r: QualifyingDriverResult) => r.driverId)).toEqual(["hamilton", "lawson", "lindblad"]);
  });

  it("refetches a completed session whose stored positions are inconsistent", async () => {
    m.getRaceDetailRaw.mockResolvedValue({ ...existingDetail(), qualifyingResults: [ham, lin, law], qualifyingComplete: true });
    m.jolpicaFetchQualifyingResults.mockResolvedValue([ham, { ...lin, position: 3 }, { ...law, position: 2 }].sort((a, b) => a.position - b.position));

    const changed = await syncActiveSessionData("f1", 2026, race, { ignoreWindow: true });

    expect(changed).toBe(true);
    expect(m.jolpicaFetchQualifyingResults).toHaveBeenCalled();
  });
});

describe("refetchActiveWeekendSessions", () => {
  it("only touches races in an active weekend", async () => {
    const pastRace = {
      ...race,
      round: 18,
      date: new Date(NOW - 7 * 24 * HOUR).toISOString(),
      sessions: [{ type: "qualifying", date: new Date(NOW - 8 * 24 * HOUR).toISOString() }],
    } as Race;
    m.getCachedSchedule.mockResolvedValue({ races: [pastRace, race], fresh: true });
    m.jolpicaFetchQualifyingResults.mockResolvedValue([jolpicaRow]);

    const synced = await refetchActiveWeekendSessions(2026);

    expect(synced).toBe(1);
    expect(m.jolpicaFetchQualifyingResults).toHaveBeenCalledTimes(1);
    expect(m.jolpicaFetchQualifyingResults).toHaveBeenCalledWith(2026, 19);
  });
});
