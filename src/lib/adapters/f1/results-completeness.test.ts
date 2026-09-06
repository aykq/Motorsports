import { describe, it, expect } from "vitest";
import { raceResultsLookIncomplete, keepFullerResults } from "./results-completeness";
import type { Race, RaceResult } from "@/types/series";

function race(status: Race["status"], results?: RaceResult[]): Race {
  return {
    round: 10,
    name: "Belgian Grand Prix",
    circuitId: "spa",
    circuitName: "Spa",
    location: "Spa",
    country: "Belgium",
    date: "2026-07-19T13:00:00+00:00",
    sessions: [],
    status,
    ...(results ? { results } : {}),
  };
}

function results(n: number): RaceResult[] {
  return Array.from({ length: n }, (_, i) => ({
    position: i + 1,
    driverId: `d${i}`,
    driverName: `D ${i}`,
    team: "T",
    points: 0,
    status: "Finished",
  }));
}

describe("raceResultsLookIncomplete", () => {
  it("flags a completed race with only a couple of results", () => {
    expect(raceResultsLookIncomplete(race("completed"), 2)).toBe(true);
  });

  it("flags a completed race with zero results", () => {
    expect(raceResultsLookIncomplete(race("completed"), 0)).toBe(true);
  });

  it("accepts a completed race with a full field", () => {
    expect(raceResultsLookIncomplete(race("completed"), 20)).toBe(false);
  });

  it("also checks a live race", () => {
    expect(raceResultsLookIncomplete(race("live"), 3)).toBe(true);
  });

  it("never flags a cancelled race", () => {
    expect(raceResultsLookIncomplete(race("cancelled"), 0)).toBe(false);
  });

  it("never flags an upcoming race", () => {
    expect(raceResultsLookIncomplete(race("upcoming"), 0)).toBe(false);
  });
});

describe("keepFullerResults", () => {
  it("keeps the stored results when the incoming write has fewer for a completed race", () => {
    const incoming = race("completed", results(2));
    const existing = race("completed", results(20));
    expect(keepFullerResults(incoming, existing).results).toHaveLength(20);
  });

  it("keeps the stored results when the incoming write has none", () => {
    const incoming = race("completed");
    const existing = race("completed", results(20));
    expect(keepFullerResults(incoming, existing).results).toHaveLength(20);
  });

  it("takes the incoming results when they are at least as many", () => {
    const incoming = race("completed", results(20));
    const existing = race("completed", results(2));
    expect(keepFullerResults(incoming, existing).results).toHaveLength(20);
  });

  it("takes incoming when there is no existing row", () => {
    const incoming = race("completed", results(2));
    expect(keepFullerResults(incoming, undefined).results).toHaveLength(2);
  });

  it("does not guard an upcoming existing race", () => {
    const incoming = race("upcoming");
    const existing = race("upcoming", results(0));
    expect(keepFullerResults(incoming, existing).results ?? []).toHaveLength(0);
  });

  it("returns the same object identity when nothing changes", () => {
    const incoming = race("completed", results(20));
    expect(keepFullerResults(incoming, undefined)).toBe(incoming);
  });
});
