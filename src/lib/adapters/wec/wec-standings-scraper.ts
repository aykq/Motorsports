import type { Standing } from "@/types/series";
import { getWECDrivers } from "./wec-drivers";

const STANDINGS_URL = "https://www.fiawec.com/en/page/manufacturers-classification";
const TIMEOUT_MS = 15_000;

// Map fiawec.com team names → our teamId slugs
const LMGT3_TEAM_IDS: Record<string, string> = {
  "TF SPORT": "tf-sport",
  "VISTA AF CORSE": "vista-af-corse",
  "AKKODIS ASP TEAM": "akkodis-asp",
  "HEART OF RACING TEAM": "heart-of-racing",
  "TEAM WRT": "team-wrt",
  "GARAGE 59": "garage-59",
  "PROTON COMPETITION": "proton-competition",
  "IRON LYNX": "iron-lynx",
  "THE BEND MANTHEY": "manthey-bend",
  "MANTHEY DK ENGINEERING": "manthey-dk",
  "RACING TEAM TURKEY BY TF": "racing-team-turkey",
};

// Parse points: "36 +1" → 36+1=37, "0 +1" → 1, "-" → 0
function parsePoints(raw: string): number {
  if (!raw || raw === "-") return 0;
  const m = raw.match(/(\d+)(?:\s*\+(\d+))?/);
  if (!m) return 0;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0);
}

// Extract text from HTML cell (strip tags)
function cellText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Parse all <table> elements from HTML, returning rows of cell texts
function parseTables(html: string): string[][][] {
  const tables: string[][][] = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRe.exec(html)) !== null) {
    const rows: string[][] = [];
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(tm[0])) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[dh](?:\s[^>]*)?>[\s\S]*?<\/t[dh]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[0])) !== null) {
        cells.push(cellText(cm[0]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

async function fetchHTML(): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(STANDINGS_URL, {
      signal: ctrl.signal,
      headers: { "User-Agent": "motorsports-hub/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`fiawec standings ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Slugify a full name "KAMUI KOBAYASHI" → "kamui-kobayashi"
function slugName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function scrapeWECDriverStandings(season: number): Promise<Standing[]> {
  const wecDrivers = getWECDrivers(season);
  // Build lookup: slugified "firstname-lastname" → driver
  const driverById = new Map(wecDrivers.map((d) => [d.id, d]));
  // Also build lookup by slugified full name (handles "KAMUI KOBAYASHI" → "kamui-kobayashi")
  const driverBySlug = new Map<string, typeof wecDrivers[0]>();
  for (const d of wecDrivers) {
    const slug1 = slugName(`${d.firstName} ${d.lastName}`);
    const slug2 = slugName(`${d.lastName} ${d.firstName}`);
    driverBySlug.set(slug1, d);
    driverBySlug.set(slug2, d);
    driverById.set(d.id, d);
  }

  const html = await fetchHTML();
  const tables = parseTables(html);

  // Table index 1 = Hypercar Drivers, Table index 3 = LMGT3 Drivers
  // Cols: [Pos, Man, #, Drivers (names comma-separated), race1...raceN, Total]
  const standings: Standing[] = [];
  const seen = new Set<string>();

  for (const tableIdx of [1, 3]) {
    const table = tables[tableIdx];
    if (!table) continue;
    for (const row of table) {
      if (row[0] === "Pos." || !row[0]) continue;
      const pos = parseInt(row[0], 10);
      if (isNaN(pos)) continue;
      const totalRaw = row[row.length - 1];
      const total = parsePoints(totalRaw);
      const driverNamesRaw = row[3] ?? "";

      // Multiple drivers separated by comma
      const names = driverNamesRaw.split(",").map((n) => n.trim()).filter(Boolean);
      for (const name of names) {
        const slug = slugName(name);
        const driver = driverBySlug.get(slug);
        if (!driver) continue;
        if (seen.has(driver.id)) continue;
        seen.add(driver.id);
        standings.push({
          position: pos,
          points: total,
          wins: 0,
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            nationality: driver.nationality,
            team: driver.team,
            teamId: driver.teamId,
            image: driver.image,
          },
        });
      }
    }
  }

  return standings.sort((a, b) => b.points - a.points).map((s, i) => ({ ...s, position: i + 1 }));
}

export async function scrapeWECTeamStandings(season: number): Promise<Standing[]> {
  const wecDrivers = getWECDrivers(season);
  const html = await fetchHTML();
  const tables = parseTables(html);

  const standings: Standing[] = [];

  // Table index 2 = LMGT3 Teams
  // Cols: [Pos, Competitors/Man, #, Team, race1...raceN, Total]
  const lmgt3Table = tables[2];
  const seenTeams = new Set<string>();

  if (lmgt3Table) {
    for (const row of lmgt3Table) {
      if (row[0] === "Pos." || !row[0]) continue;
      const pos = parseInt(row[0], 10);
      if (isNaN(pos)) continue;
      const teamName = row[3]?.trim() ?? "";
      const total = parsePoints(row[row.length - 1]);
      const teamId = LMGT3_TEAM_IDS[teamName];
      if (!teamId || seenTeams.has(teamId)) continue;
      seenTeams.add(teamId);

      const teamDrivers = wecDrivers.filter((d) => d.teamId === teamId);
      const displayName = teamDrivers[0]?.team ?? teamName;

      standings.push({
        position: pos,
        points: total,
        wins: 0,
        team: { id: teamId, name: displayName },
      });
    }
  }

  // Hypercar teams — synthesize from Hypercar driver standings (table 1)
  // Group points by teamId using car number mapping
  const hypercarTable = tables[1];
  const hypercarTeamPoints = new Map<string, { points: number; pos: number }>();

  if (hypercarTable) {
    for (const row of hypercarTable) {
      if (row[0] === "Pos." || !row[0]) continue;
      const pos = parseInt(row[0], 10);
      if (isNaN(pos)) continue;
      const carNoRaw = (row[2] ?? "").replace("#", "").trim();
      const total = parsePoints(row[row.length - 1]);
      // Find matching team from wec-drivers
      const matchedDriver = wecDrivers.find(
        (d) => String(d.number) === carNoRaw || `0${d.number}` === carNoRaw || `00${d.number}` === carNoRaw
      );
      if (!matchedDriver?.teamId) continue;
      const existing = hypercarTeamPoints.get(matchedDriver.teamId);
      if (!existing || total > existing.points) {
        hypercarTeamPoints.set(matchedDriver.teamId, { points: total, pos });
      }
    }
  }

  const hypercarOffset = standings.length;
  let hcPos = hypercarOffset + 1;
  for (const [teamId, { points }] of [...hypercarTeamPoints.entries()].sort((a, b) => b[1].points - a[1].points)) {
    if (seenTeams.has(teamId)) continue;
    seenTeams.add(teamId);
    const teamDrivers = wecDrivers.filter((d) => d.teamId === teamId);
    const displayName = teamDrivers[0]?.team ?? teamId;
    standings.push({
      position: hcPos++,
      points,
      wins: 0,
      team: { id: teamId, name: displayName },
    });
  }

  return standings;
}
