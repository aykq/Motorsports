import { describe, it, expect } from "vitest";
import { mergeFetchedRaceDetail, reconcilePracticeDriverIds } from "./race-detail-merge";
import type { RaceDetail, PracticeDriverResult } from "@/types/series";

describe("reconcilePracticeDriverIds", () => {
  const map = new Map<number, string>([
    [63, "russell"],
    [1, "max_verstappen"],
  ]);

  it("rewrites a stale driver id to the canonical one by number", () => {
    const input: PracticeDriverResult[] = [
      { position: 1, driverNumber: 63, driverId: "george-russell", driverName: "G. Russell", lapTime: "1:19" },
    ];
    expect(reconcilePracticeDriverIds(input, map)[0].driverId).toBe("russell");
  });

  it("returns the same array reference when nothing needs changing", () => {
    const input: PracticeDriverResult[] = [
      { position: 1, driverNumber: 63, driverId: "russell", driverName: "George Russell", lapTime: "1:19" },
    ];
    expect(reconcilePracticeDriverIds(input, map)).toBe(input);
  });

  it("never blanks a driver id when the number is not in the map", () => {
    const input: PracticeDriverResult[] = [
      { position: 1, driverNumber: 99, driverId: "someone", driverName: "S", lapTime: "1:19" },
    ];
    expect(reconcilePracticeDriverIds(input, map)[0].driverId).toBe("someone");
  });

  it("leaves a result with no driver number alone", () => {
    const input: PracticeDriverResult[] = [
      { position: 1, driverId: "george-russell", driverName: "G. Russell", lapTime: "1:19" },
    ];
    expect(reconcilePracticeDriverIds(input, map)).toBe(input);
  });
});

function practice(n: number): PracticeDriverResult[] {
  return Array.from({ length: n }, (_, i) => ({
    position: i + 1,
    driverNumber: i + 1,
    driverName: `Driver ${i + 1}`,
    lapTime: "1:20.000",
  }));
}

const EMPTY: RaceDetail = {
  pitStops: [],
  tireStints: [],
  raceControl: [],
  raceControlTr: [],
  driverStandingsAfter: [],
  teamStandingsAfter: [],
  weather: [],
  qualifyingResults: [],
  sprintResults: [],
  practice1Results: [],
  practice2Results: [],
  practice3Results: [],
};

describe("mergeFetchedRaceDetail", () => {
  it("keeps stored practice results when the fresh fetch failed", () => {
    const stored: RaceDetail = {
      ...EMPTY,
      practice2Results: practice(20),
      practice2Fetched: true,
    };
    const fresh: RaceDetail = {
      ...EMPTY,
      practice2Results: [], // failed fetch swallowed to empty upstream
      practice2Fetched: false,
    };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.practice2Results).toHaveLength(20);
    expect(merged.practice2Fetched).toBe(true);
  });

  it("accepts an empty result when the fresh fetch actually succeeded", () => {
    const stored: RaceDetail = {
      ...EMPTY,
      practice3Results: practice(20),
      practice3Fetched: true,
    };
    const fresh: RaceDetail = {
      ...EMPTY,
      practice3Results: [],
      practice3Fetched: true, // genuine: session had no timed laps
    };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.practice3Results).toEqual([]);
    expect(merged.practice3Fetched).toBe(true);
  });

  it("takes fresh practice results when the fetch succeeded with data", () => {
    const stored: RaceDetail = { ...EMPTY, practice1Results: practice(5), practice1Fetched: true };
    const fresh: RaceDetail = { ...EMPTY, practice1Results: practice(20), practice1Fetched: true };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.practice1Results).toHaveLength(20);
  });

  it("protects tireStints and raceControl the same way", () => {
    const stored: RaceDetail = {
      ...EMPTY,
      tireStints: [{ driverNumber: 1, compound: "SOFT", lapStart: 1, lapEnd: 20, tyreAgeAtStart: 0 }],
      stintsFetched: true,
      raceControl: [{ category: "Flag", message: "GREEN LIGHT" }],
      raceControlFetched: true,
    };
    const fresh: RaceDetail = {
      ...EMPTY,
      tireStints: [],
      stintsFetched: false,
      raceControl: [],
      raceControlFetched: false,
    };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.tireStints).toHaveLength(1);
    expect(merged.raceControl).toHaveLength(1);
  });

  it("passes fresh through untouched when there is no stored detail", () => {
    const fresh: RaceDetail = { ...EMPTY, practice1Results: practice(20), practice1Fetched: true };

    const merged = mergeFetchedRaceDetail(null, fresh);

    expect(merged.practice1Results).toHaveLength(20);
    expect(merged.practice1Fetched).toBe(true);
  });

  it("does not let a failed fetch downgrade a previously-set fetched flag", () => {
    const stored: RaceDetail = { ...EMPTY, practice1Results: practice(20), practice1Fetched: true };
    const fresh: RaceDetail = { ...EMPTY, practice1Results: [], practice1Fetched: false };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.practice1Fetched).toBe(true);
  });

  it("leaves Jolpica-sourced fields (qualifying) to the fresh payload", () => {
    const stored: RaceDetail = { ...EMPTY, qualifyingResults: [] };
    const fresh: RaceDetail = {
      ...EMPTY,
      qualifyingResults: [
        { position: 1, driverId: "x", driverName: "X", team: "T" },
      ],
    };

    const merged = mergeFetchedRaceDetail(stored, fresh);

    expect(merged.qualifyingResults).toHaveLength(1);
  });
});
