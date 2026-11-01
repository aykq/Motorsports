import { describe, it, expect } from "vitest";
import type { QualifyingDriverResult } from "@/types/series";
import { hasConsistentPositions, rankByTimes, reorderByReference } from "./qualifying-order";

function row(
  position: number,
  driverId: string,
  times: Partial<Pick<QualifyingDriverResult, "q1" | "q2" | "q3">> = {}
): QualifyingDriverResult {
  return { position, driverId, driverName: driverId, team: "T", ...times };
}

// Jolpica's 2026 R19 entry: two P8s, everyone after shifted up by one.
const r19 = [
  row(7, "hadjar", { q1: "1:17.385", q2: "1:17.047", q3: "1:16.900" }),
  row(8, "lindblad", { q1: "1:18.210", q2: "1:17.135", q3: "1:17.117" }),
  row(8, "lawson", { q1: "", q2: "1:17.207", q3: "1:17.029" }),
  row(9, "gasly", { q1: "1:18.194", q2: "1:17.278", q3: "1:17.153" }),
  row(10, "hulkenberg", { q1: "1:17.868", q2: "1:17.306", q3: "" }),
  row(17, "alonso", { q1: "1:18.908" }),
  row(18, "ryo_hirakawa", { q1: "1:18.958" }),
];

describe("hasConsistentPositions", () => {
  it("accepts 1..n", () => {
    expect(hasConsistentPositions([row(1, "a"), row(2, "b"), row(3, "c")])).toBe(true);
  });

  it("rejects a duplicate", () => {
    expect(hasConsistentPositions([row(1, "a"), row(1, "b"), row(2, "c")])).toBe(false);
  });

  it("rejects a gap", () => {
    expect(hasConsistentPositions([row(1, "a"), row(3, "b")])).toBe(false);
  });

  it("accepts an empty list", () => {
    expect(hasConsistentPositions([])).toBe(true);
  });
});

describe("rankByTimes", () => {
  it("ranks by furthest segment, then time, and renumbers", () => {
    const ranked = rankByTimes(r19);

    expect(ranked.map((r) => r.driverId)).toEqual([
      "hadjar",
      "lawson",
      "lindblad",
      "gasly",
      "hulkenberg",
      "alonso",
      "ryo_hirakawa",
    ]);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("puts drivers without any time last", () => {
    const ranked = rankByTimes([row(1, "none"), row(2, "slow", { q1: "1:20.000" })]);
    expect(ranked.map((r) => r.driverId)).toEqual(["slow", "none"]);
  });
});

describe("reorderByReference", () => {
  it("follows the reference order, keeps the row data and renumbers", () => {
    const reference = [row(1, "b"), row(2, "c"), row(3, "a")];
    const rows = [
      { ...row(1, "a"), driverCode: "AAA" },
      { ...row(1, "b"), driverCode: "BBB" },
      { ...row(2, "c"), driverCode: "CCC" },
    ];

    const out = reorderByReference(rows, reference);

    expect(out.map((r) => [r.position, r.driverId, r.driverCode])).toEqual([
      [1, "b", "BBB"],
      [2, "c", "CCC"],
      [3, "a", "AAA"],
    ]);
  });

  it("matches by code when ids differ and appends unmatched rows", () => {
    const reference = [{ ...row(1, "max-verstappen"), driverCode: "VER" }];
    const rows = [row(1, "unknown"), { ...row(2, "max_verstappen"), driverCode: "VER" }];

    const out = reorderByReference(rows, reference);

    expect(out.map((r) => r.driverId)).toEqual(["max_verstappen", "unknown"]);
  });
});
