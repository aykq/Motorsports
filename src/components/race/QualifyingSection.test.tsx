import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QualifyingSection, parseLapTimeMs, formatGapToLeader } from "./QualifyingSection";
import type { QualifyingDriverResult } from "@/types/series";

describe("parseLapTimeMs", () => {
  it("parses M:SS.mmm format", () => {
    expect(parseLapTimeMs("1:31.824")).toBeCloseTo(91824, 0);
  });

  it("parses a sub-minute time without minutes", () => {
    expect(parseLapTimeMs("59.643")).toBeCloseTo(59643, 0);
  });

  it("returns null for garbage input", () => {
    expect(parseLapTimeMs("not-a-time")).toBeNull();
  });
});

describe("formatGapToLeader", () => {
  it("formats the gap with a leading + and Turkish comma decimal", () => {
    expect(formatGapToLeader(245)).toBe("+0,245");
  });

  it("handles a gap over a minute", () => {
    expect(formatGapToLeader(65_123)).toBe("+65,123");
  });
});

const LABELS = { qualifyingResults: "Sıralama", q2Eliminated: "Q2'de elendi", q1Eliminated: "Q1'de elendi" };

function driver(overrides: Partial<QualifyingDriverResult>): QualifyingDriverResult {
  return {
    position: 1,
    driverId: "driver",
    driverName: "Test Driver",
    team: "Test Team",
    ...overrides,
  };
}

describe("QualifyingSection rendering", () => {
  it("shows the pole time as-is and every other Q3 row as a gap to pole", () => {
    const results = [
      driver({ position: 1, driverId: "norris", q1: "1:33.469", q2: "1:32.873", q3: "1:31.824" }),
      driver({ position: 2, driverId: "antonelli", q1: "1:33.267", q2: "1:32.591", q3: "1:32.069" }),
    ];

    const html = renderToStaticMarkup(<QualifyingSection results={results} labels={LABELS} slug="f1" />);

    expect(html).toContain("1:31.824"); // pole shows its own time
    expect(html).toContain("+0,245"); // 1:32.069 - 1:31.824 = 0.245s
    expect(html).not.toContain("1:32.069"); // raw time must not leak through for a non-leader row
  });

  it("shows every Q1/Q2-eliminated driver's gap relative to the overall pole, not their own segment's fastest", () => {
    const results = [
      driver({ position: 1, driverId: "pole", q1: "1:33.000", q2: "1:32.000", q3: "1:31.000" }),
      driver({ position: 11, driverId: "q2-fastest", q1: "1:33.100", q2: "1:32.500" }),
      driver({ position: 12, driverId: "q2-second", q1: "1:33.200", q2: "1:32.750" }),
      driver({ position: 20, driverId: "q1-last", q1: "1:34.500" }),
    ];

    const html = renderToStaticMarkup(<QualifyingSection results={results} labels={LABELS} slug="f1" />);

    expect(html).toContain("1:31.000"); // pole shows its own time
    expect(html).toContain("+1,500"); // Q2-eliminated fastest (1:32.500) vs pole (1:31.000)
    expect(html).toContain("+1,750"); // second Q2-eliminated driver vs pole
    expect(html).toContain("+3,500"); // Q1-eliminated driver vs pole, not vs Q1's own fastest
  });
});
