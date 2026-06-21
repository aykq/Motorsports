import * as cheerio from "cheerio";
import type { Standing, Driver, Race, RaceSession, RaceStatus } from "@/types/series";

const BASE_URL = "https://www.gt4europeanseries.com";
const TIMEOUT_MS = 15_000;

async function fetchGT4Page(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "motorsports-hub/1.0", Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GT4 ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePoints(text: string): number {
  const val = parseFloat(text.replace(",", ".").trim());
  return isNaN(val) ? 0 : val;
}

function computeStatus(raceDate: string): RaceStatus {
  const now = Date.now();
  const race = new Date(raceDate).getTime();
  const twoHours = 2 * 60 * 60 * 1000;
  if (race < now - twoHours) return "completed";
  if (race <= now + twoHours) return "live";
  return "upcoming";
}

// ─── Circuit coordinates ──────────────────────────────────────────────────────

const CIRCUIT_COORDS: Record<string, [number, number]> = {
  "circuit paul ricard":                [43.2506,   5.7916],
  "paul ricard":                        [43.2506,   5.7916],
  "brands hatch":                       [51.3578,   0.2634],
  "monza":                              [45.6156,   9.2811],
  "circuit de spa-francorchamps":       [50.4372,   5.9714],
  "spa-francorchamps":                  [50.4372,   5.9714],
  "spa":                                [50.4372,   5.9714],
  "misano world circuit":               [43.9626,  12.6976],
  "misano":                             [43.9626,  12.6976],
  "circuit zandvoort":                  [52.3888,   4.5457],
  "zandvoort":                          [52.3888,   4.5457],
  "autodromo internacional do algarve": [37.2272,  -8.6260],
  "portimao":                           [37.2272,  -8.6260],
  "circuit de barcelona-catalunya":     [41.5700,   2.2611],
  "barcelona":                          [41.5700,   2.2611],
  "nürburgring":                        [50.3356,   6.9475],
  "nurburgring":                        [50.3356,   6.9475],
};

function getCircuitCoords(name: string): [number, number] | undefined {
  const key = name.toLowerCase().trim();
  if (CIRCUIT_COORDS[key]) return CIRCUIT_COORDS[key];
  return Object.entries(CIRCUIT_COORDS).find(([k]) => key.includes(k) || k.includes(key))?.[1];
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

const MONTH_NUM: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function makeIso(day: number, monthStr: string, year: number, utcHour = 9): string | null {
  const month = MONTH_NUM[monthStr.toLowerCase().substring(0, 3)];
  if (!month || isNaN(day) || isNaN(year)) return null;
  return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0)).toISOString();
}

// Parse "10 - 12 April 2026" → [startIso, endIso]
function parseDateRange(text: string): [string, string] | null {
  const m = text.trim().match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const startDay = parseInt(m[1], 10);
  const endDay   = parseInt(m[2], 10);
  const monthStr = m[3];
  const year     = parseInt(m[4], 10);
  const startIso = makeIso(startDay, monthStr, year, 9);
  const endIso   = makeIso(endDay, monthStr, year, 13);
  if (!startIso || !endIso) return null;
  return [startIso, endIso];
}

// Parse day + month abbreviation + year strings (from upcoming events)
function parseDateParts(day: string, month: string, year: string, utcHour = 9): string | null {
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  return makeIso(d, month, y, utcHour);
}

// ─── Session builder (sprint format: P1 → Q → R1 → R2) ──────────────────────

function buildSessions(startIso: string, endIso: string): RaceSession[] {
  const qual = new Date(startIso);
  qual.setUTCDate(qual.getUTCDate() + 1);
  qual.setUTCHours(9, 0, 0, 0);
  const race1 = new Date(qual);
  race1.setUTCHours(13, 0, 0, 0);
  return [
    { type: "practice1",  date: startIso },
    { type: "qualifying", date: qual.toISOString() },
    { type: "sprint",     date: race1.toISOString() }, // Race 1
    { type: "race",       date: endIso },               // Race 2
  ];
}

// ─── Calendar scraper ─────────────────────────────────────────────────────────

export async function scrapeGT4Schedule(season: number): Promise<Race[]> {
  const html = await fetchGT4Page(`${BASE_URL}/calendar`);
  const $    = cheerio.load(html);
  const races: Race[] = [];
  const seen  = new Set<number>();

  // — Past events —
  $("li.past-events__list-item").each((_, el) => {
    const $el    = $(el);
    const spans  = $el.find("span.past-events__piped-list-span").toArray();

    // Find round span
    const roundSpan = spans.find((s) => /Round\s+\d+/i.test($(s).text()));
    if (!roundSpan) return;
    const roundMatch = $(roundSpan).text().trim().match(/Round\s+(\d+)/i);
    const round = roundMatch ? parseInt(roundMatch[1], 10) : 0;
    if (!round || seen.has(round)) return;

    // Find date span (contains " - " range pattern)
    const dateSpan = spans.find((s) => /\d+\s*[-–]\s*\d+\s+[A-Za-z]/.test($(s).text()));
    if (!dateSpan) return;
    const dates = parseDateRange($(dateSpan).text());
    if (!dates) return;
    const [startIso, endIso] = dates;

    if (new Date(endIso).getFullYear() !== season) return;

    // Circuit: <strong> inside the circuit span
    const circuitSpan = spans.find((s) => $(s).find("strong").length > 0);
    if (!circuitSpan) return;
    const circuitName = $(circuitSpan).find("strong").first().text().trim();
    const country     = $(circuitSpan).clone().find("span, strong").remove().end().text().trim();
    if (!circuitName) return;

    seen.add(round);
    const coords  = getCircuitCoords(circuitName);
    const sessions = buildSessions(startIso, endIso);

    races.push({
      round,
      name:        `GT4 European Series — ${circuitName}`,
      circuitId:   toSlug(circuitName),
      circuitName,
      location:    circuitName,
      country,
      date:        endIso,
      sessions,
      status:      computeStatus(endIso),
      ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
    });
  });

  // — Upcoming / future events —
  $("li.calendar__list-item").each((_, el) => {
    const $el = $(el);

    const roundText  = $el.find("span.calendar__race-text").first().text().trim();
    const roundMatch = roundText.match(/Round\s+(\d+)/i);
    const round      = roundMatch ? parseInt(roundMatch[1], 10) : 0;
    if (!round || seen.has(round)) return;

    const $start = $el.find(".calendar__date-start");
    const $end   = $el.find(".calendar__date-end");

    const startIso = parseDateParts(
      $start.find(".calendar__date-number").text().trim(),
      $start.find(".calendar__date-month").text().trim(),
      $start.find(".calendar__date-year").text().trim(),
      9,
    );
    const endIso = parseDateParts(
      $end.find(".calendar__date-number").text().trim(),
      $end.find(".calendar__date-month").text().trim(),
      $end.find(".calendar__date-year").text().trim(),
      13,
    );
    if (!startIso || !endIso) return;
    if (new Date(endIso).getFullYear() !== season) return;

    const circuitName = $el.find("h3.calendar__race-header").text().trim();
    const country     = $el.find("span.calendar__race-subheading-text").first().text().trim();
    if (!circuitName) return;

    seen.add(round);
    const coords   = getCircuitCoords(circuitName);
    const sessions = buildSessions(startIso, endIso);

    races.push({
      round,
      name:        `GT4 European Series — ${circuitName}`,
      circuitId:   toSlug(circuitName),
      circuitName,
      location:    circuitName,
      country,
      date:        endIso,
      sessions,
      status:      computeStatus(endIso),
      ...(coords ? { circuitLat: coords[0], circuitLng: coords[1] } : {}),
    });
  });

  return races.sort((a, b) => a.round - b.round);
}

// ─── Standings scraper ────────────────────────────────────────────────────────

function parseStandingsTable($: cheerio.CheerioAPI, type: "driver" | "team"): Standing[] {
  const result: Standing[] = [];
  const linkPattern = type === "driver" ? "/driver/" : "/team/";

  $("table.standing tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const pos = parseInt($(cells[0]).text().trim(), 10);
    if (isNaN(pos) || pos < 1) return;

    const points = parsePoints($(cells[2]).text().trim());
    const link   = $(cells[1]).find(`a[href*='${linkPattern}']`).first();
    const name   = link.length ? link.text().trim() : $(cells[1]).text().trim();
    if (!name) return;

    const href = link.attr("href") ?? "";
    const id   = href.split("/").filter(Boolean).pop() ?? toSlug(name);

    if (type === "driver") {
      const [firstName = "", ...rest] = name.split(" ");
      result.push({
        position: pos,
        points,
        wins: 0,
        driver: { id, firstName, lastName: rest.join(" "), nationality: "" },
      });
    } else {
      result.push({ position: pos, points, wins: 0, team: { id, name } });
    }
  });

  return result;
}

export async function scrapeGT4DriverStandings(): Promise<Standing[]> {
  const html = await fetchGT4Page(`${BASE_URL}/standings?filter_standing_type=0_0_drivers`);
  const $    = cheerio.load(html);
  return parseStandingsTable($, "driver");
}

export async function scrapeGT4TeamStandings(): Promise<Standing[]> {
  for (const url of [
    `${BASE_URL}/standings?filter_standing_type=0_0_teams`,
    `${BASE_URL}/standings`,
  ]) {
    try {
      const html = await fetchGT4Page(url);
      const $    = cheerio.load(html);
      const rows = parseStandingsTable($, "team");
      if (rows.length > 0) return rows;
    } catch { /* try next */ }
  }
  return [];
}

// ─── Driver list (scraped from team pages) ────────────────────────────────────

function parseGT4TeamPage(
  $: cheerio.CheerioAPI,
  teamName: string,
  teamId: string,
): Driver[] {
  const drivers: Driver[] = [];
  let currentCarNo = 0;
  let currentCarModel: string | undefined;

  const selector = [
    "span.team-members__car-number",
    "a[href*='/car/']",
    "a.team-members__list-link[href*='/driver/']",
  ].join(", ");

  $(selector).each((_, el) => {
    const $el  = $(el);
    const href = $el.attr("href") ?? "";
    const cls  = (el as { attribs?: Record<string, string> }).attribs?.class ?? "";

    if (cls.includes("car-number")) {
      const n = parseInt($el.text().trim(), 10);
      if (!isNaN(n)) { currentCarNo = n; currentCarModel = undefined; }
    } else if (href.includes("/car/")) {
      const text = $el.text().trim() || $el.find("img").first().attr("alt")?.trim() || "";
      if (text) currentCarModel = text;
    } else if (href.includes("/driver/")) {
      const name = $el.find("h3.team-members__name").text().trim();
      if (!name) return;

      const id         = href.split("/").filter(Boolean).pop() ?? toSlug(name);
      const imgSrc     = $el.find("img.team-members__image").attr("src") ?? "";
      const photoMatch = imgSrc.match(/photo_(\d+)\.(png|jpg|jpeg|webp)/i);
      const image      = photoMatch
        ? `${BASE_URL}/images/drivers/photo_${photoMatch[1]}.${photoMatch[2]}`
        : undefined;

      const [firstName = "", ...rest] = name.split(" ");
      const lastName = rest.join(" ");
      if (!lastName) return;

      drivers.push({
        id,
        firstName,
        lastName,
        nationality: "",
        number: currentCarNo,
        team:   teamName,
        teamId,
        ...(image ? { image } : {}),
        ...(currentCarModel ? { carModel: currentCarModel } : {}),
      });
    }
  });

  return drivers;
}

export async function scrapeGT4DriverList(): Promise<Driver[]> {
  // Collect team hrefs from team standings
  const html = await fetchGT4Page(`${BASE_URL}/standings?filter_standing_type=0_0_teams`);
  const $ts  = cheerio.load(html);

  const teamRefs: Array<{ name: string; href: string }> = [];
  const hrefSeen = new Set<string>();

  $ts("a[href*='/team/']").each((_, link) => {
    const href = $ts(link).attr("href")?.trim() ?? "";
    const name = $ts(link).text().trim();
    if (href && name && !hrefSeen.has(href)) {
      hrefSeen.add(href);
      teamRefs.push({ name, href });
    }
  });

  if (teamRefs.length === 0) return [];

  // Fetch team pages in parallel batches of 5
  const toFetch = teamRefs.slice(0, 30);
  const BATCH   = 5;
  const allDrivers: Driver[] = [];
  const driverSeen = new Set<string>();

  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch   = toFetch.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async ({ name, href }) => {
        const teamId = href.split("/").filter(Boolean).pop() ?? toSlug(name);
        const page   = await fetchGT4Page(`${BASE_URL}${href}`);
        const $      = cheerio.load(page);
        return parseGT4TeamPage($, name, teamId);
      })
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const d of r.value) {
        if (!driverSeen.has(d.id)) {
          driverSeen.add(d.id);
          allDrivers.push(d);
        }
      }
    }
  }

  return allDrivers;
}
