import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/error-log", () => ({ logError: vi.fn() }));

import { OpenF1NoDataError } from "@/lib/adapters/f1/openf1";
import { firstNonEmpty, isSessionComplete } from "./source-chain";

const practice = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ position: i + 1, driverName: `D${i}`, lapTime: "1:17.600" }));
const quali = (n: number, withQ3: number) =>
  Array.from({ length: n }, (_, i) => ({
    position: i + 1, driverId: `d${i}`, driverName: `D${i}`, team: "T", q3: i < withQ3 ? "1:31.000" : undefined,
  }));

describe("isSessionComplete", () => {
  it("completes practice from OpenF1 or motorsport.com once 15 drivers have a time", () => {
    expect(isSessionComplete("practice", "openf1", practice(15))).toBe(true);
    expect(isSessionComplete("practice", "mscom", practice(20))).toBe(true);
    expect(isSessionComplete("practice", "mscom", practice(14))).toBe(false);
  });

  it("lets only Jolpica complete qualifying", () => {
    expect(isSessionComplete("qualifying", "jolpica", quali(22, 10))).toBe(true);
    expect(isSessionComplete("qualifying", "mscom", quali(22, 10))).toBe(false);
    expect(isSessionComplete("qualifying", "openf1", quali(22, 10))).toBe(false);
  });

  it("completes sprint qualifying from a full scraped table even when SQ3 drivers set no time", () => {
    // Singapore 2026 SQ3: Hadjar and Gasly ran without a time, so only 8 have one.
    expect(isSessionComplete("sprintQuali", "mscom", quali(22, 8))).toBe(true);
    expect(isSessionComplete("sprintQuali", "openf1", quali(22, 8))).toBe(false);
    expect(isSessionComplete("sprintQuali", "openf1", quali(22, 10))).toBe(true);
    expect(isSessionComplete("sprintQuali", null, [])).toBe(false);
  });
});

describe("firstNonEmpty", () => {
  it("returns the first source with data and does not call later ones", async () => {
    const later = vi.fn(async () => ["c"]);
    const out = await firstNonEmpty<string>([
      ["jolpica", async () => []],
      ["openf1", async () => ["b"]],
      ["mscom", later],
    ]);
    expect(out).toEqual({ results: ["b"], source: "openf1", succeeded: ["jolpica", "openf1"] });
    expect(later).not.toHaveBeenCalled();
  });

  it("skips unavailable steps and falls through a failing source", async () => {
    const out = await firstNonEmpty<string>([
      ["openf1", null],
      ["jolpica", async () => { throw new Error("boom"); }],
      ["mscom", async () => ["x"]],
    ]);
    expect(out.source).toBe("mscom");
    expect(out.succeeded).toEqual(["mscom"]);
  });

  it("reports which sources ran successfully when none had data", async () => {
    const out = await firstNonEmpty<string>([
      ["openf1", async () => []],
      ["mscom", async () => []],
    ]);
    expect(out).toEqual({ results: [], source: null, succeeded: ["openf1", "mscom"] });
  });

  it("rethrows a real failure over a no-data one when nothing had data", async () => {
    await expect(
      firstNonEmpty<string>([
        ["openf1", async () => { throw new OpenF1NoDataError("no data"); }],
        ["jolpica", async () => { throw new Error("HTTP 500"); }],
        ["mscom", async () => []],
      ])
    ).rejects.toThrow("HTTP 500");
  });

  it("rethrows the no-data error when that is the only failure", async () => {
    await expect(
      firstNonEmpty<string>([
        ["openf1", async () => { throw new OpenF1NoDataError("no data"); }],
        ["mscom", async () => []],
      ])
    ).rejects.toBeInstanceOf(OpenF1NoDataError);
  });
});
