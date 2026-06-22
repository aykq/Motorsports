import * as cheerio from "cheerio";
import type { Standing, Driver, RaceSession, Race, RaceStatus } from "@/types/series";

const BASE_URL = "https://www.gt-world-challenge-europe.com";
const TIMEOUT_MS = 15_000;

const SPRINT_DRIVERS_FILTER = "0_0_drivers";
const SPRINT_TEAMS_FILTER   = "0_0_teams";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchGTWCEPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "motorsports-hub/1.0", Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GTWCE ${res.status}: ${url}`);
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

function idFromHref(href: string): string {
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function computeStatus(raceDate: string): RaceStatus {
  const now = Date.now();
  const race = new Date(raceDate).getTime();
  const twoHours = 2 * 60 * 60 * 1000;
  if (race < now - twoHours) return "completed";
  if (race <= now + twoHours) return "live";
  return "upcoming";
}

// ─── Circuit coordinates lookup ───────────────────────────────────────────────

const CIRCUIT_COORDS: Record<string, [number, number]> = {
  "circuit paul ricard":               [43.2506,   5.7916],
  "brands hatch":                      [51.3578,   0.2634],
  "monza":                             [45.6156,   9.2811],
  "circuit de spa-francorchamps":      [50.4372,   5.9714],
  "crowdstrike 24 hours of spa":       [50.4372,   5.9714],
  "spa":                               [50.4372,   5.9714],
  "misano world circuit":              [43.9626,  12.6976],
  "misano":                            [43.9626,  12.6976],
  "circuit de nevers magny-cours":     [46.8642,   3.1636],
  "magny-cours":                       [46.8642,   3.1636],
  "nürburgring":                       [50.3356,   6.9475],
  "nurburgring":                       [50.3356,   6.9475],
  "circuit zandvoort":                 [52.3888,   4.5457],
  "zandvoort":                         [52.3888,   4.5457],
  "circuit de barcelona-catalunya":    [41.5700,   2.2611],
  "barcelona":                         [41.5700,   2.2611],
  "autodromo internacional do algarve":[37.2272,  -8.6260],
  "portimao":                          [37.2272,  -8.6260],
  "paul ricard":                       [43.2506,   5.7916],
};

function getCircuitCoords(name: string): [number, number] | undefined {
  const key = name.toLowerCase().trim();
  if (CIRCUIT_COORDS[key]) return CIRCUIT_COORDS[key];
  return Object.entries(CIRCUIT_COORDS).find(([k]) => key.includes(k) || k.includes(key))?.[1];
}

// ─── Calendar parsing ─────────────────────────────────────────────────────────

const MONTH_NUM: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseCalendarDate(text: string, utcHour = 9): string | null {
  const m = text.trim().match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const day   = parseInt(m[1], 10);
  const month = MONTH_NUM[m[2].toLowerCase()];
  const year  = parseInt(m[3], 10);
  if (!month || isNaN(day) || isNaN(year)) return null;
  return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0)).toISOString();
}

function buildSprintSessionsFromRange(startIso: string, endIso: string): RaceSession[] {
  // Day 1: Practice, Day 2: Qualifying + Race 1 (13:00), Day 3: Race 2 (endIso)
  const qual = new Date(startIso);
  qual.setUTCDate(qual.getUTCDate() + 1);
  qual.setUTCHours(9, 0, 0, 0);
  const race1 = new Date(qual);
  race1.setUTCHours(13, 0, 0, 0);
  return [
    { type: "practice1",  date: startIso },
    { type: "qualifying", date: qual.toISOString() },
    { type: "sprint",     date: race1.toISOString() },
    { type: "race",       date: endIso },
  ];
}

function buildEnduranceSessionsFromRange(startIso: string, endIso: string): RaceSession[] {
  // Day 1: P1, Day 2: P2, Day before race: Qualifying, Race day: endIso
  const p2 = new Date(startIso);
  p2.setUTCDate(p2.getUTCDate() + 1);
  p2.setUTCHours(9, 0, 0, 0);
  const qual = new Date(endIso);
  qual.setUTCDate(qual.getUTCDate() - 1);
  qual.setUTCHours(10, 0, 0, 0);
  return [
    { type: "practice1",  date: startIso },
    { type: "practice2",  date: p2.toISOString() },
    { type: "qualifying", date: qual.toISOString() },
    { type: "race",       date: endIso },
  ];
}

// ─── Calendar scraper ─────────────────────────────────────────────────────────

export async function scrapeGTWCESchedule(season: number): Promise<Race[]> {
  const html = await fetchGTWCEPage(`${BASE_URL}/calendar`);
  const $    = cheerio.load(html);
  const races: Race[] = [];
  const seen = new Set<number>();

  $("*").each((_, container) => {
    const $c      = $(container);
    const children = $c.children();

    // Find a direct-child <p> with "Round N" text
    const roundEl = children.filter("p").toArray()
      .find((p) => /Round\s+\d+/i.test($(p).text()));
    if (!roundEl) return;

    const roundText  = $(roundEl).text().trim();
    const roundMatch = roundText.match(/Round\s+(\d+)/i);
    const round      = roundMatch ? parseInt(roundMatch[1], 10) : 0;
    if (!round || seen.has(round)) return;

    // Date spans — "DD MON YYYY" format
    const dateSpans = children.filter("span").toArray()
      .map((s) => $(s).text().trim())
      .filter((t) => /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(t));
    if (dateSpans.length === 0) return;

    const isEndurance  = /endurance/i.test(roundText);
    const startIso     = parseCalendarDate(dateSpans[0], 9);
    const endIso       = parseCalendarDate(dateSpans[dateSpans.length - 1], 13);
    if (!startIso || !endIso) return;

    if (new Date(endIso).getFullYear() !== season) return;

    const circuitName = children.filter("h3").first().text().trim();
    const country     = children.filter("h4").first().text().trim();
    if (!circuitName) return;

    seen.add(round);
    const coords = getCircuitCoords(circuitName);
    const sessions = isEndurance
      ? buildEnduranceSessionsFromRange(startIso, endIso)
      : buildSprintSessionsFromRange(startIso, endIso);

    races.push({
      round,
      name: `GT World Challenge Europe ${isEndurance ? "Endurance" : "Sprint"} Cup — ${circuitName}`,
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

// ─── Team roster scraper ──────────────────────────────────────────────────────

function parseTeamRoster(
  $: cheerio.CheerioAPI,
  teamName: string,
  teamId: string,
): Driver[] {
  const drivers: Driver[] = [];
  let currentCarNo = 0;

  // Car model link appears in the page header, outside the team-members section.
  // Exclude sponsor image-only links (class "sponsors__list-link") which have empty text.
  const carModel = $("a[href*='/car/']")
    .filter((_, el) => {
      const cls = (el as { attribs?: Record<string, string> }).attribs?.class ?? "";
      return !cls.includes("sponsors");
    })
    .map((_, el) => $(el).text().trim() || $(el).find("img").first().attr("alt")?.trim() || "")
    .get()
    .find((t) => t.length > 0);

  $("span.team-members__car-number, a.team-members__list-link[href*='/driver/']").each((_, el) => {
    const $el = $(el);
    const cls = (el as { attribs?: Record<string, string> }).attribs?.class ?? "";

    if (cls.includes("car-number")) {
      const n = parseInt($el.text().trim(), 10);
      if (!isNaN(n)) currentCarNo = n;
    } else {
      const href = $el.attr("href") ?? "";
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
        number:      currentCarNo,
        team:        teamName,
        teamId,
        ...(image ? { image } : {}),
        ...(carModel ? { carModel } : {}),
      });
    }
  });

  return drivers;
}

async function scrapeTeamPage(href: string, teamName: string): Promise<Driver[]> {
  const teamId  = idFromHref(href);
  const html    = await fetchGTWCEPage(`${BASE_URL}${href}`);
  const $       = cheerio.load(html);
  return parseTeamRoster($, teamName, teamId);
}

// ─── Driver list (aggregated from team standings + team pages) ────────────────

export async function scrapeGTWCEDriverList(): Promise<Driver[]> {
  // Get team hrefs from the team standings page
  const html = await fetchGTWCEPage(`${BASE_URL}/standings?filter_standing_type=${SPRINT_TEAMS_FILTER}`);
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

  // Fetch team pages in parallel batches of 5 (max 25 teams)
  const toFetch = teamRefs.slice(0, 25);
  const BATCH   = 5;
  const allDrivers: Driver[] = [];
  const driverSeen = new Set<string>();

  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch   = toFetch.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((t) => scrapeTeamPage(t.href, t.name))
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

// ─── Standings scrapers ───────────────────────────────────────────────────────

function parseDriverStandings($: cheerio.CheerioAPI): Standing[] {
  const result: Standing[] = [];

  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const pos = parseInt($(cells[0]).text().trim(), 10);
    if (isNaN(pos) || pos < 1) return;

    const points     = parsePoints($(cells[2]).text().trim());
    const driverCell = $(cells[1]);
    const links      = driverCell.find("a[href*='/driver/']");

    if (links.length > 0) {
      links.each((_, link) => {
        const href = $(link).attr("href") ?? "";
        const slug = idFromHref(href);
        const name = $(link).text().trim();
        if (!name) return;
        const [firstName = "", ...rest] = name.split(" ");
        result.push({ position: pos, points, wins: 0,
          driver: { id: slug || toSlug(name), firstName, lastName: rest.join(" "), nationality: "" } });
      });
      return;
    }

    const text  = driverCell.text().trim();
    if (!text) return;
    text.split("/").map((n) => n.trim()).filter(Boolean).forEach((name) => {
      const [firstName = "", ...rest] = name.split(" ");
      result.push({ position: pos, points, wins: 0,
        driver: { id: toSlug(name), firstName, lastName: rest.join(" "), nationality: "" } });
    });
  });

  return result;
}

function parseTeamStandings($: cheerio.CheerioAPI): Standing[] {
  const result: Standing[] = [];

  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const pos = parseInt($(cells[0]).text().trim(), 10);
    if (isNaN(pos) || pos < 1) return;

    const points   = parsePoints($(cells[2]).text().trim());
    const teamCell = $(cells[1]);
    const link     = teamCell.find("a[href*='/team/']").first();
    const teamName = link.length ? link.text().trim() : teamCell.text().trim();
    if (!teamName) return;

    const href   = link.attr("href") ?? "";
    const teamId = idFromHref(href) || toSlug(teamName);

    result.push({ position: pos, points, wins: 0, team: { id: teamId, name: teamName } });
  });

  return result;
}

export async function scrapeGTWCEDriverStandings(): Promise<Standing[]> {
  const html = await fetchGTWCEPage(`${BASE_URL}/standings?filter_standing_type=${SPRINT_DRIVERS_FILTER}`);
  const $    = cheerio.load(html);
  return parseDriverStandings($).filter((s) => (s.driver?.firstName ?? "").length > 0);
}

export async function scrapeGTWCETeamStandings(): Promise<Standing[]> {
  for (const suffix of [`?filter_standing_type=${SPRINT_TEAMS_FILTER}`, ""]) {
    try {
      const html = await fetchGTWCEPage(`${BASE_URL}/standings${suffix}`);
      const $    = cheerio.load(html);
      const rows = parseTeamStandings($);
      if (rows.length > 0) return rows;
    } catch { /* try next */ }
  }
  return [];
}
