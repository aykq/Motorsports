import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logError } = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock("@/lib/error-log", () => ({ logError }));

import {
  jolpicaFetchQualifyingResults,
  jolpicaFetchSprintResults,
  jolpicaFetchRaceResults,
} from "./jolpica";

beforeEach(() => {
  logError.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function failingFetch(status = 500) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("nope", { status })
  );
}

// A prior bug swallowed every Jolpica fetch failure silently (bare `catch { return [] }`),
// so a session that failed to fetch never appeared in error_log and nothing ever retried it
// once its active-session window closed — see race-detail.ts SESSION_WINDOW_MS comment.
describe("Jolpica per-session result fetchers log failures instead of swallowing them", () => {
  it("jolpicaFetchQualifyingResults logs and returns [] on fetch failure", async () => {
    failingFetch();

    const result = await jolpicaFetchQualifyingResults(2026, 14);

    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ source: "jolpica/jolpicaFetchQualifyingResults", severity: "warning" })
    );
  });

  it("jolpicaFetchSprintResults logs and returns [] on fetch failure", async () => {
    failingFetch();

    const result = await jolpicaFetchSprintResults(2026, 14);

    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ source: "jolpica/jolpicaFetchSprintResults", severity: "warning" })
    );
  });

  it("jolpicaFetchRaceResults logs and returns [] on fetch failure", async () => {
    failingFetch();

    const result = await jolpicaFetchRaceResults(2026, 14);

    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ source: "jolpica/jolpicaFetchRaceResults", severity: "warning" })
    );
  });
});
