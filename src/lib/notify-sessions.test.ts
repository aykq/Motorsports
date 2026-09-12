import { describe, it, expect, vi, beforeEach } from "vitest";

const { isMScomF1RaceFinished, getRaceDetailRaw } = vi.hoisted(() => ({
  isMScomF1RaceFinished: vi.fn(),
  getRaceDetailRaw: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ sentNotifications: {} }));
vi.mock("@/lib/push", () => ({ sendPushToSubscribers: vi.fn() }));
vi.mock("@/lib/series-config", () => ({ getSeriesConfig: vi.fn() }));
vi.mock("@/lib/app-settings", () => ({ getShowNonF1Series: vi.fn() }));
vi.mock("@/lib/adapters/f1/motorsport-com-scraper", () => ({ isMScomF1RaceFinished }));
vi.mock("@/lib/cache", () => ({ recomputeRaceStatus: vi.fn(), getRaceDetailRaw }));

import { isF1SessionResultsReady } from "./notify-sessions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isF1SessionResultsReady", () => {
  it("checks the motorsport.com scraper for race sessions, not the RaceDetail cache", async () => {
    isMScomF1RaceFinished.mockResolvedValue(true);

    const ready = await isF1SessionResultsReady("f1", 2026, 15, "race", "Spanish Grand Prix");

    expect(ready).toBe(true);
    expect(isMScomF1RaceFinished).toHaveBeenCalledWith(2026, "Spanish Grand Prix");
    expect(getRaceDetailRaw).not.toHaveBeenCalled();
  });

  it.each([
    ["practice1", "practice1Complete"],
    ["practice2", "practice2Complete"],
    ["practice3", "practice3Complete"],
    ["qualifying", "qualifyingComplete"],
    ["sprintQuali", "sprintQualiComplete"],
    ["sprint", "sprintComplete"],
  ])("reads %s readiness from the %s flag already computed by session-sync", async (sessionType, flag) => {
    getRaceDetailRaw.mockResolvedValue({ [flag]: true });

    const ready = await isF1SessionResultsReady("f1", 2026, 15, sessionType, "Spanish Grand Prix");

    expect(ready).toBe(true);
    expect(getRaceDetailRaw).toHaveBeenCalledWith("f1", 2026, 15);
  });

  it("is false when the flag is not yet set", async () => {
    getRaceDetailRaw.mockResolvedValue({ qualifyingComplete: false });

    const ready = await isF1SessionResultsReady("f1", 2026, 15, "qualifying", "Spanish Grand Prix");

    expect(ready).toBe(false);
  });

  it("is false when there is no cached RaceDetail yet", async () => {
    getRaceDetailRaw.mockResolvedValue(null);

    const ready = await isF1SessionResultsReady("f1", 2026, 15, "qualifying", "Spanish Grand Prix");

    expect(ready).toBe(false);
  });

  it("is false for an unrecognized session type without touching the cache", async () => {
    const ready = await isF1SessionResultsReady("f1", 2026, 15, "something-new", "Spanish Grand Prix");

    expect(ready).toBe(false);
    expect(getRaceDetailRaw).not.toHaveBeenCalled();
  });
});
