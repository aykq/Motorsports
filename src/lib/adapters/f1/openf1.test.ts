import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/error-log", () => ({ logError: vi.fn() }));

import {
  fetchOpenF1Sessions,
  __clearOpenF1SessionCache,
  openf1ArePracticeResultsComplete,
} from "./openf1";

const SESSION = {
  session_key: 9999,
  session_name: "Race",
  session_type: "Race",
  date_start: "2026-09-06T13:00:00+00:00",
  date_end: "2026-09-06T15:00:00+00:00",
  year: 2026,
  circuit_short_name: "Monza",
  country_name: "Italy",
  location: "Monza",
  meeting_key: 1,
};

const FP1_SESSION = {
  ...SESSION,
  session_key: 8888,
  session_name: "Practice 1",
  session_type: "Practice",
  date_start: "2026-09-06T11:30:00+00:00",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function driver(driver_number: number) {
  return {
    driver_number,
    full_name: `Driver ${driver_number}`,
    session_key: FP1_SESSION.session_key,
    meeting_key: FP1_SESSION.meeting_key,
  };
}

function lap(driver_number: number, lap_duration = 90) {
  return { driver_number, lap_duration, is_pit_out_lap: false };
}

function mockOpenF1(routes: { drivers?: unknown[]; laps?: unknown[]; sessions?: unknown[] }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/sessions?")) return jsonResponse(routes.sessions ?? [FP1_SESSION]);
    if (url.includes("/drivers?")) return jsonResponse(routes.drivers ?? []);
    if (url.includes("/laps?")) return jsonResponse(routes.laps ?? []);
    throw new Error(`unexpected URL in test: ${url}`);
  });
}

beforeEach(() => {
  __clearOpenF1SessionCache();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchOpenF1Sessions", () => {
  it("hits the network once for repeat calls of the same year within the TTL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse([SESSION]));

    const a = await fetchOpenF1Sessions(2026);
    const b = await fetchOpenF1Sessions(2026);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
  });

  it("fetches separately for a different year", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse([SESSION]));

    await fetchOpenF1Sessions(2026);
    await fetchOpenF1Sessions(2025);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("re-fetches after the TTL expires", async () => {
    let nowMock = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMock);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse([SESSION]));

    await fetchOpenF1Sessions(2026);
    nowMock += 3 * 60 * 1000;
    await fetchOpenF1Sessions(2026);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("nope", { status: 429 }))
      .mockImplementation(async () => jsonResponse([SESSION]));

    await expect(fetchOpenF1Sessions(2026)).rejects.toThrow(/429/);
    const ok = await fetchOpenF1Sessions(2026);

    expect(ok).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("openf1ArePracticeResultsComplete", () => {
  const drivers = [1, 2, 3, 4, 5].map(driver);

  it("is true once lap results cover every driver", async () => {
    mockOpenF1({ drivers, laps: drivers.map((d) => lap(d.driver_number)) });

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(true);
  });

  it("is true when only one driver is missing a lap (tolerance)", async () => {
    mockOpenF1({ drivers, laps: drivers.slice(0, 4).map((d) => lap(d.driver_number)) });

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(true);
  });

  it("is false while several drivers still have no lap", async () => {
    mockOpenF1({ drivers, laps: drivers.slice(0, 2).map((d) => lap(d.driver_number)) });

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(false);
  });

  it("is false when no matching session is found", async () => {
    mockOpenF1({ sessions: [], drivers, laps: drivers.map((d) => lap(d.driver_number)) });

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(false);
  });

  it("is false when the driver list itself is empty", async () => {
    mockOpenF1({ drivers: [], laps: [] });

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(false);
  });

  it("is false on a network failure instead of throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));

    const ready = await openf1ArePracticeResultsComplete(2026, FP1_SESSION.date_start, "practice1");

    expect(ready).toBe(false);
  });
});
