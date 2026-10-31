import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import type { Driver } from "@/types/series";

vi.mock("@/lib/error-log", () => ({ logError: vi.fn() }));

import {
  findF1EventUrl,
  parseMScomPitLaps,
  parseMScomTable,
  parseMScomTyreHistory,
  toPracticeResults,
  toQualifyingResults,
  toRaceResults,
  toTireStints,
} from "./motorsport-com-scraper";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "__fixtures__", "mscom", `${name}.html`), "utf-8");

const driver = (number: number, id: string, firstName: string, lastName: string, code: string, team: string): Driver => ({
  id, number, firstName, lastName, code, team, nationality: "",
});
const ROSTER: Driver[] = [
  driver(1, "norris", "Lando", "Norris", "NOR", "McLaren"),
  driver(12, "antonelli", "Andrea Kimi", "Antonelli", "ANT", "Mercedes"),
  driver(3, "max_verstappen", "Max", "Verstappen", "VER", "Red Bull"),
  driver(16, "leclerc", "Charles", "Leclerc", "LEC", "Ferrari"),
];

describe("findF1EventUrl", () => {
  const slugs = [
    "australian-gp-661639", "austrian-gp-661669", "azerbaijan-gp-661663", "bahrain-gp-in-malaysia",
    "barcelona-catalunya-gp", "belgian-gp-661675", "british-gp-661672", "canadian-gp-661657",
    "chinese-gp-661642", "dutch-gp-661681", "hungarian-gp-661678", "italian-gp-661684",
    "japanese-gp-661645", "mexican-gp-661693", "miami-gp-661654", "monaco-gp-661660",
    "singapore-gp-661687", "spanish-gp-662335", "united-states-gp-661690",
  ];
  const links = slugs.map((slug) => ({ slug, url: `https://www.motorsport.com/f1/results/2026/${slug}/` }));

  it.each([
    ["Australian Grand Prix", "australian-gp-661639"],
    ["Austrian Grand Prix", "austrian-gp-661669"],
    ["Chinese Grand Prix", "chinese-gp-661642"],
    ["Japanese Grand Prix", "japanese-gp-661645"],
    ["Miami Grand Prix", "miami-gp-661654"],
    ["Canadian Grand Prix", "canadian-gp-661657"],
    ["Monaco Grand Prix", "monaco-gp-661660"],
    ["Barcelona Grand Prix", "barcelona-catalunya-gp"],
    ["British Grand Prix", "british-gp-661672"],
    ["Belgian Grand Prix", "belgian-gp-661675"],
    ["Hungarian Grand Prix", "hungarian-gp-661678"],
    ["Dutch Grand Prix", "dutch-gp-661681"],
    ["Italian Grand Prix", "italian-gp-661684"],
    ["Spanish Grand Prix", "spanish-gp-662335"],
    ["Azerbaijan Grand Prix", "azerbaijan-gp-661663"],
    ["Bahrain Grand Prix in Malaysia", "bahrain-gp-in-malaysia"],
    ["Singapore Grand Prix", "singapore-gp-661687"],
    ["United States Grand Prix", "united-states-gp-661690"],
    ["Mexico City Grand Prix", "mexican-gp-661693"],
  ])("maps %s to its results page", (name, slug) => {
    expect(findF1EventUrl(name, links)).toBe(`https://www.motorsport.com/f1/results/2026/${slug}/`);
  });

  it("ignores accents and short words in the race name", () => {
    const brazil = { slug: "sao-paulo-gp-661696", url: "https://www.motorsport.com/f1/results/2026/sao-paulo-gp-661696/" };
    expect(findF1EventUrl("S\u00e3o Paulo Grand Prix", [...links, brazil])).toBe(brazil.url);
  });

  it("returns null when the event is not in the index yet", () => {
    expect(findF1EventUrl("Las Vegas Grand Prix", links)).toBeNull();
  });

  // Slugs for the rounds still to come, as motorsport.com named them in 2025.
  it.each([
    ["Brazilian Grand Prix", "sao-paulo-gp-653219"],
    ["Las Vegas Grand Prix", "las-vegas-gp-653223"],
    ["Qatar Grand Prix", "qatar-gp-653227"],
    ["Abu Dhabi Grand Prix", "abu-dhabi-gp-653231"],
  ])("maps the upcoming %s", (name, slug) => {
    const upcoming = ["sao-paulo-gp-653219", "las-vegas-gp-653223", "qatar-gp-653227", "abu-dhabi-gp-653231"].map(
      (s) => ({ slug: s, url: `https://www.motorsport.com/f1/results/2025/${s}/` })
    );
    expect(findF1EventUrl(name, [...links, ...upcoming])).toBe(`https://www.motorsport.com/f1/results/2025/${slug}/`);
  });

  it("also accepts a brazilian-gp slug for Interlagos", () => {
    const brazil = { slug: "brazilian-gp-661696", url: "https://www.motorsport.com/f1/results/2026/brazilian-gp-661696/" };
    expect(findF1EventUrl("Brazilian Grand Prix", [...links, brazil])).toBe(brazil.url);
  });
});

describe("parseMScomTable", () => {
  it("returns no rows for a page without a results table (session not published)", () => {
    expect(parseMScomTable("<html><body><p>Live now</p></body></html>")).toEqual([]);
  });

  it("throws when a required column disappears", () => {
    const html = fixture("mexico-fp3").replace(/ms-table_field--time/g, "ms-table_field--renamed");
    expect(() => parseMScomTable(html)).toThrow(/layout changed/);
  });
});

describe("toPracticeResults", () => {
  it("maps Mexico FP3 to lap times and gaps, with roster ids by car number", () => {
    const results = toPracticeResults(parseMScomTable(fixture("mexico-fp3")), ROSTER);
    // #5 and #11 set no time; like the OpenF1 laps path, drivers without a lap are left out.
    expect(results).toHaveLength(20);
    expect(results[0]).toMatchObject({
      position: 1, driverNumber: 1, driverId: "norris", driverCode: "NOR", lapTime: "1:17.600", gap: undefined,
    });
    expect(results[1]).toMatchObject({
      position: 2, driverNumber: 12, driverId: "antonelli", lapTime: "1:17.601", gap: "+0.001",
    });
    expect(results[2]).toMatchObject({ position: 3, driverNumber: 16, lapTime: "1:17.717", gap: "+0.117" });
    // Piastri (#81) is not in this roster: no id, so the UI renders no dead driver link.
    expect(results[3]).toMatchObject({ driverNumber: 81, driverId: undefined, driverName: "O. Piastri" });
  });
});

describe("toQualifyingResults", () => {
  it("combines CQ order with Q1/Q2/Q3 part times", () => {
    const results = toQualifyingResults(
      parseMScomTable(fixture("singapore-cq")),
      [
        parseMScomTable(fixture("singapore-q1")),
        parseMScomTable(fixture("singapore-q2")),
        parseMScomTable(fixture("singapore-q3")),
      ],
      ROSTER
    );
    expect(results).toHaveLength(22);
    expect(results[0]).toMatchObject({ position: 1, driverId: "max_verstappen", driverCode: "VER", q3: "1:31.373" });
    expect(results[0]!.q1).toMatch(/^1:3\d\.\d{3}$/);
    expect(results[0]!.q2).toMatch(/^1:3\d\.\d{3}$/);
    expect(results.filter((r) => r.q3)).toHaveLength(10);
    expect(results.filter((r) => r.q2).length).toBeGreaterThanOrEqual(15);
    expect(results.map((r) => r.position)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });
});

describe("toRaceResults", () => {
  it("takes positions from table order, so a classified retirement keeps its slot", () => {
    const results = toRaceResults(parseMScomTable(fixture("singapore-race")), ROSTER);
    expect(results).toHaveLength(22);
    expect(results[0]).toMatchObject({
      position: 1, driverId: "max_verstappen", time: "1:42:00.785", gap: undefined, points: 25, status: "Finished", laps: 62,
    });
    expect(results[1]).toMatchObject({ position: 2, driverId: "leclerc", gap: "+7.335", points: 18 });
    expect(results[17]).toMatchObject({ position: 18, driverNumber: 23, status: "Retired" });
    expect(results[18]).toMatchObject({ position: 19, driverNumber: 77, status: "Finished", gap: "+3 Laps" });
    const last = results[results.length - 1]!;
    expect(last).toMatchObject({ position: 22, driverNumber: 5, status: "Retired", gap: undefined, points: 0 });
  });

  it("parses the sprint table the same way", () => {
    const results = toRaceResults(parseMScomTable(fixture("singapore-spr")), ROSTER);
    expect(results[0]).toMatchObject({ position: 1, driverId: "max_verstappen", time: "39:48.162", points: 8 });
    expect(results[1]).toMatchObject({ position: 2, gap: "+2.591", points: 7 });
  });
});

describe("toTireStints", () => {
  const raceLaps = () =>
    new Map(
      parseMScomTable(fixture("singapore-race")).flatMap((r) =>
        r.driverNumber != null && r.laps != null ? [[r.driverNumber, r.laps] as const] : []
      )
    );
  const build = () =>
    toTireStints(
      parseMScomTyreHistory(fixture("singapore-th")),
      parseMScomPitLaps(fixture("singapore-pt")),
      raceLaps()
    );

  it("splits stints at pit laps for every driver in Singapore 2026", () => {
    const { stints, skipped } = build();
    expect(skipped).toEqual([]);
    expect(stints.filter((s) => s.driverNumber === 3)).toEqual([
      { driverNumber: 3, compound: "SOFT", lapStart: 1, lapEnd: 32, tyreAgeAtStart: 0 },
      { driverNumber: 3, compound: "MEDIUM", lapStart: 33, lapEnd: 62, tyreAgeAtStart: 0 },
    ]);
  });

  it("derives a used tyre's starting age from its total age at stint end", () => {
    // Leclerc: used S (27 at end) → new M → used S (26 at end), pits on laps 24 and 39.
    expect(build().stints.filter((s) => s.driverNumber === 16)).toEqual([
      { driverNumber: 16, compound: "SOFT", lapStart: 1, lapEnd: 24, tyreAgeAtStart: 3 },
      { driverNumber: 16, compound: "MEDIUM", lapStart: 25, lapEnd: 39, tyreAgeAtStart: 0 },
      { driverNumber: 16, compound: "SOFT", lapStart: 40, lapEnd: 62, tyreAgeAtStart: 3 },
    ]);
  });

  it("ends a retired driver's last stint on their final lap", () => {
    expect(build().stints.filter((s) => s.driverNumber === 5)).toEqual([
      { driverNumber: 5, compound: "MEDIUM", lapStart: 1, lapEnd: 7, tyreAgeAtStart: 0 },
    ]);
  });

  it("skips a driver whose pit stops don't match the tyre history", () => {
    const pits = parseMScomPitLaps(fixture("singapore-pt")).filter((p) => !(p.driverNumber === 16 && p.lap === 39));
    const { stints, skipped } = toTireStints(parseMScomTyreHistory(fixture("singapore-th")), pits, raceLaps());
    expect(skipped).toEqual([16]);
    expect(stints.some((s) => s.driverNumber === 16)).toBe(false);
  });
});
