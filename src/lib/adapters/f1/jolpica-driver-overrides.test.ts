import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logError } = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock("@/lib/error-log", () => ({ logError }));

import { jolpicaFetchQualifyingResults, jolpicaFetchDriverStandings } from "./jolpica";

const HIRAKAWA = { driverId: "ryo_hirakawa", givenName: "Ryo", familyName: "Hirakawa" };
const ALBON = {
  driverId: "albon",
  permanentNumber: "23",
  code: "ALB",
  givenName: "Alexander",
  familyName: "Albon",
  nationality: "Thai",
};
const HAAS = { constructorId: "haas", name: "Haas F1 Team", nationality: "American" };

function mockJolpica(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(JSON.stringify(body), { status: 200 })
  );
}

beforeEach(() => {
  logError.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Jolpica drivers with missing fields", () => {
  it("parses qualifying when a driver has no code, number or nationality", async () => {
    mockJolpica({
      MRData: {
        RaceTable: {
          Races: [
            {
              QualifyingResults: [
                { position: "17", Driver: ALBON, Constructor: HAAS, Q1: "1:18.630" },
                { position: "19", Driver: HIRAKAWA, Constructor: HAAS, Q1: "1:18.958" },
              ],
            },
          ],
        },
      },
    });

    const result = await jolpicaFetchQualifyingResults(2026, 19);

    expect(logError).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ driverId: "ryo_hirakawa", driverCode: "HIR" });
  });

  it("fills standings from the override and keeps Jolpica values", async () => {
    mockJolpica({
      MRData: {
        StandingsTable: {
          StandingsLists: [
            {
              DriverStandings: [
                { position: "13", points: "20", wins: "0", Driver: ALBON, Constructors: [HAAS] },
                { position: "24", points: "0", wins: "0", Driver: HIRAKAWA, Constructors: [HAAS] },
              ],
            },
          ],
        },
      },
    });

    const [albon, hirakawa] = await jolpicaFetchDriverStandings(2026);

    expect(albon!.driver).toMatchObject({ code: "ALB", number: 23, nationality: "Thai" });
    expect(hirakawa!.driver).toMatchObject({ code: "HIR", number: 50, nationality: "Japanese" });
  });

  it("uses an empty nationality for an unknown driver instead of failing", async () => {
    mockJolpica({
      MRData: {
        StandingsTable: {
          StandingsLists: [
            {
              DriverStandings: [
                {
                  position: "25",
                  points: "0",
                  wins: "0",
                  Driver: { driverId: "rookie", givenName: "New", familyName: "Rookie" },
                  Constructors: [HAAS],
                },
              ],
            },
          ],
        },
      },
    });

    const [rookie] = await jolpicaFetchDriverStandings(2026);

    expect(rookie!.driver).toMatchObject({ id: "rookie", nationality: "" });
    expect(rookie!.driver!.code).toBeUndefined();
  });
});
