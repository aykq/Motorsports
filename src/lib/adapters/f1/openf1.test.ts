import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/error-log", () => ({ logError: vi.fn() }));

import { fetchOpenF1Sessions, __clearOpenF1SessionCache } from "./openf1";

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
