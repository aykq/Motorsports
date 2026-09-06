import { describe, it, expect } from "vitest";
import { normalizeScrapedResults } from "./normalize-scraped-results";
import type { Driver, RaceResult } from "@/types/series";

const roster: Driver[] = [
  { id: "russell", firstName: "George", lastName: "Russell", code: "RUS", number: 63, nationality: "British", team: "Mercedes", teamId: "mercedes" },
  { id: "max_verstappen", firstName: "Max", lastName: "Verstappen", code: "VER", number: 1, nationality: "Dutch", team: "Red Bull", teamId: "red_bull" },
];

function scraped(over: Partial<RaceResult>): RaceResult {
  return {
    position: 1,
    driverId: "george-russell",
    driverName: "G. Russell",
    driverNumber: 63,
    team: "Mercedes",
    points: 25,
    status: "Finished",
    ...over,
  };
}

describe("normalizeScrapedResults", () => {
  it("replaces the scraped driver id with the canonical one by number", () => {
    const [r] = normalizeScrapedResults([scraped({})], roster);
    expect(r.driverId).toBe("russell");
  });

  it("replaces the abbreviated name with the full name", () => {
    const [r] = normalizeScrapedResults([scraped({})], roster);
    expect(r.driverName).toBe("George Russell");
  });

  it("fills in code and teamId from the roster", () => {
    const [r] = normalizeScrapedResults([scraped({ driverCode: undefined, teamId: undefined })], roster);
    expect(r.driverCode).toBe("RUS");
    expect(r.teamId).toBe("mercedes");
  });

  it("leaves a result untouched when its number is not on the roster", () => {
    const input = scraped({ driverId: "jack-doohan", driverName: "J. Doohan", driverNumber: 7 });
    const [r] = normalizeScrapedResults([input], roster);
    expect(r.driverId).toBe("jack-doohan");
    expect(r.driverName).toBe("J. Doohan");
  });

  it("leaves a result untouched when it has no driver number", () => {
    const input = scraped({ driverNumber: undefined });
    const [r] = normalizeScrapedResults([input], roster);
    expect(r.driverId).toBe("george-russell");
  });

  it("keeps every other field as scraped", () => {
    const [r] = normalizeScrapedResults([scraped({ position: 2, points: 18, gap: "+5.1", laps: 53 })], roster);
    expect(r).toMatchObject({ position: 2, points: 18, gap: "+5.1", laps: 53, driverNumber: 63 });
  });

  it("does not fetch or need a roster entry when the roster is empty", () => {
    const [r] = normalizeScrapedResults([scraped({})], []);
    expect(r.driverId).toBe("george-russell");
  });
});
