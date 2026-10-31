import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/error-log", () => ({ logError: vi.fn() }));

import {
  fetchOpenF1Sessions,
  fetchOpenF1SprintResults,
  fetchOpenF1PracticeResults,
  OpenF1NoDataError,
  __clearOpenF1SessionCache,
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

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
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

describe("fetchOpenF1SprintResults", () => {
  it("keeps retirements that have no position, after the classified drivers", async () => {
    const driver = (n: number, code: string) => ({
      driver_number: n, full_name: `Driver ${code}`, name_acronym: code, team_name: "Team", session_key: 1, meeting_key: 1,
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/drivers")
        ? jsonResponse([driver(1, "AAA"), driver(2, "BBB"), driver(3, "CCC"), driver(4, "DDD")])
        : jsonResponse([
            { driver_number: 3, position: null, dnf: true },
            { driver_number: 1, position: 1, duration: 2400, dnf: false },
            { driver_number: 4, position: null, dnf: true },
            { driver_number: 2, position: 2, gap_to_leader: 1.5, dnf: false },
          ])
    );
    const results = await fetchOpenF1SprintResults(1, new Map());
    expect(results.map((r) => [r.position, r.driverCode, r.status])).toEqual([
      [1, "AAA", "Finished"],
      [2, "BBB", "Finished"],
      [3, "CCC", "Retired"],
      [4, "DDD", "Retired"],
    ]);
    expect(results[2].points).toBe(0);
  });
});

describe("fetchOpenF1PracticeResults", () => {
  const driver = (n: number, code: string) => ({
    driver_number: n, full_name: `Driver ${code}`, name_acronym: code, team_name: "Team", session_key: 1, meeting_key: 1,
  });
  const noData = () => new Response(JSON.stringify({ detail: "No results found." }), { status: 404 });

  it("ranks by best non-pit-out lap from /laps", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/drivers")) return jsonResponse([driver(1, "AAA"), driver(2, "BBB")]);
      if (url.includes("/laps"))
        return jsonResponse([
          { driver_number: 1, lap_duration: 80.5, is_pit_out_lap: false },
          { driver_number: 1, lap_duration: 70, is_pit_out_lap: true },
          { driver_number: 2, lap_duration: 79.25, is_pit_out_lap: false },
        ]);
      throw new Error(`unexpected ${url}`);
    });
    const results = await fetchOpenF1PracticeResults(1);
    expect(results.map((r) => [r.position, r.driverCode, r.lapTime, r.gap])).toEqual([
      [1, "BBB", "1:19.250", undefined],
      [2, "AAA", "1:20.500", "+1.250"],
    ]);
  });

  it("falls back to session_result when /laps has no data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/drivers")) return jsonResponse([driver(1, "AAA"), driver(12, "KIM")]);
      if (url.includes("/laps")) return noData();
      if (url.includes("/session_result"))
        return jsonResponse([
          { driver_number: 12, position: 2, duration: 77.601 },
          { driver_number: 1, position: 1, duration: 77.6 },
          { driver_number: 5, position: 22, duration: null },
        ]);
      throw new Error(`unexpected ${url}`);
    });
    const results = await fetchOpenF1PracticeResults(11399);
    expect(results.map((r) => [r.position, r.driverCode, r.lapTime, r.gap])).toEqual([
      [1, "AAA", "1:17.600", undefined],
      [2, "KIM", "1:17.601", "+0.001"],
    ]);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/session_result?session_key=11399"))).toBe(true);
  });

  it("throws OpenF1NoDataError when neither source has data, so the session is retried", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/drivers") ? jsonResponse([driver(1, "AAA")]) : noData()
    );
    await expect(fetchOpenF1PracticeResults(1)).rejects.toBeInstanceOf(OpenF1NoDataError);
  });

  it("does not fall back on a real failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/drivers") ? jsonResponse([driver(1, "AAA")]) : new Response("boom", { status: 500 })
    );
    await expect(fetchOpenF1PracticeResults(1)).rejects.toThrow(/500/);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/session_result"))).toBe(false);
  });
});
