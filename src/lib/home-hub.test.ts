import { describe, it, expect } from "vitest";
import { getNextRace, getLastCompletedRace, getTopDriversWithPoints } from "./home-hub";
import type { Race, Standing, Driver } from "@/types/series";

function race(overrides: Partial<Race> = {}): Race {
  return {
    round: 1,
    name: "Test GP",
    circuitId: "test",
    circuitName: "Test Circuit",
    location: "Test City",
    country: "Testland",
    date: "2026-05-01T14:00:00Z",
    sessions: [{ type: "race", date: "2026-05-01T14:00:00Z" }],
    status: "upcoming",
    ...overrides,
  };
}

describe("getNextRace", () => {
  it("returns the soonest upcoming or live race", () => {
    const races = [
      race({ round: 1, status: "completed", date: "2026-01-01T00:00:00Z", sessions: [{ type: "race", date: "2026-01-01T00:00:00Z" }] }),
      race({ round: 3, status: "upcoming", date: "2026-06-01T00:00:00Z", sessions: [{ type: "race", date: "2026-06-01T00:00:00Z" }] }),
      race({ round: 2, status: "upcoming", date: "2026-04-01T00:00:00Z", sessions: [{ type: "race", date: "2026-04-01T00:00:00Z" }] }),
    ];
    expect(getNextRace(races)?.round).toBe(2);
  });

  it("treats a live race as a valid next-race candidate", () => {
    const races = [race({ round: 5, status: "live", date: "2026-03-01T00:00:00Z", sessions: [{ type: "race", date: "2026-03-01T00:00:00Z" }] })];
    expect(getNextRace(races)?.round).toBe(5);
  });

  it("returns null when there is no upcoming or live race", () => {
    const races = [race({ status: "completed" }), race({ status: "cancelled" })];
    expect(getNextRace(races)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(getNextRace([])).toBeNull();
  });
});

describe("getLastCompletedRace", () => {
  it("returns the most recently completed race with results", () => {
    const races = [
      race({ round: 1, status: "completed", date: "2026-01-01T00:00:00Z", sessions: [{ type: "race", date: "2026-01-01T00:00:00Z" }], results: [{ position: 1, driverId: "d1", driverName: "A", team: "T1", points: 25, status: "Finished" }] }),
      race({ round: 2, status: "completed", date: "2026-03-01T00:00:00Z", sessions: [{ type: "race", date: "2026-03-01T00:00:00Z" }], results: [{ position: 1, driverId: "d2", driverName: "B", team: "T2", points: 25, status: "Finished" }] }),
      race({ round: 3, status: "upcoming", date: "2026-05-01T00:00:00Z", sessions: [{ type: "race", date: "2026-05-01T00:00:00Z" }] }),
    ];
    expect(getLastCompletedRace(races)?.round).toBe(2);
  });

  it("skips completed races that have no results yet (not synced)", () => {
    const races = [
      race({ round: 1, status: "completed", date: "2026-01-01T00:00:00Z", sessions: [{ type: "race", date: "2026-01-01T00:00:00Z" }], results: [{ position: 1, driverId: "d1", driverName: "A", team: "T1", points: 25, status: "Finished" }] }),
      race({ round: 2, status: "completed", date: "2026-03-01T00:00:00Z", sessions: [{ type: "race", date: "2026-03-01T00:00:00Z" }], results: [] }),
    ];
    expect(getLastCompletedRace(races)?.round).toBe(1);
  });

  it("returns null when no race has been completed yet (start of season)", () => {
    const races = [race({ status: "upcoming" }), race({ status: "cancelled" })];
    expect(getLastCompletedRace(races)).toBeNull();
  });
});

describe("getTopDriversWithPoints", () => {
  const drivers: Driver[] = [
    { id: "d1", firstName: "Ayrton", lastName: "Senna", nationality: "BR", image: "/d1.webp" },
    { id: "d2", firstName: "Alain", lastName: "Prost", nationality: "FR", image: "/d2.webp" },
  ];
  const standings: Standing[] = [
    { position: 1, points: 100, wins: 5, driver: { id: "d1", firstName: "Ayrton", lastName: "Senna", nationality: "BR" } },
    { position: 2, points: 80, wins: 3, driver: { id: "d2", firstName: "Alain", lastName: "Prost", nationality: "FR" } },
  ];

  it("merges standings points with roster data (photo) by driver id", () => {
    const result = getTopDriversWithPoints(standings, drivers, 5);
    expect(result).toEqual([
      { driver: drivers[0], points: 100, position: 1 },
      { driver: drivers[1], points: 80, position: 2 },
    ]);
  });

  it("respects the limit", () => {
    const result = getTopDriversWithPoints(standings, drivers, 1);
    expect(result).toHaveLength(1);
    expect(result[0].driver.id).toBe("d1");
  });

  it("drops entries with no matching driver anywhere", () => {
    const standingsWithGhost: Standing[] = [
      { position: 1, points: 50, wins: 0, driver: undefined },
    ];
    expect(getTopDriversWithPoints(standingsWithGhost, drivers, 5)).toEqual([]);
  });
});
