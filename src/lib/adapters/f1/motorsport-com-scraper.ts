import * as cheerio from "cheerio";
import type {
  Driver,
  PracticeDriverResult,
  QualifyingDriverResult,
  RaceResult,
  TireCompound,
  TireStint,
} from "@/types/series";
import { logError } from "@/lib/error-log";

const BASE = "https://www.motorsport.com";
const TIMEOUT_MS = 15_000;
const INDEX_TTL_MS = 10 * 60 * 1000;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; motorsports-hub/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── URL Discovery ────────────────────────────────────────────────────────────

interface EventLink {
  slug: string;
  url: string;
}

const indexCache = new Map<number, { at: number; links: EventLink[] }>();

/** Test-only: reset the memoized results index and pages. */
export function __clearMScomCaches(): void {
  indexCache.clear();
  pageCache.clear();
}

export function parseF1ResultsIndex(html: string, season: number): EventLink[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: EventLink[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/f1\/results\/\d+\/([^/?#]+)\//);
    if (!m) return;
    const slug = m[1];
    // Pre-season tests ve diğer non-race eventleri filtrele
    if (seen.has(slug) || /pre.season|pre_season|test/i.test(slug)) return;
    seen.add(slug);
    links.push({ slug, url: `${BASE}/f1/results/${season}/${slug}/` });
  });

  return links;
}

async function scrapeF1ResultsIndex(season: number): Promise<EventLink[]> {
  const hit = indexCache.get(season);
  if (hit && Date.now() - hit.at < INDEX_TTL_MS) return hit.links;
  const links = parseF1ResultsIndex(await fetchPage(`${BASE}/f1/results/${season}/`), season);
  if (links.length) indexCache.set(season, { at: Date.now(), links });
  return links;
}

// Jolpica names whose words miss the motorsport.com slug (Interlagos was "sao-paulo-gp" in 2025, "Brazilian" in Jolpica 2026).
const SLUG_WORD_ALIASES: Record<string, string[]> = {
  "mexico city grand prix": ["mexican", "mexico"],
  "brazilian grand prix": ["brazilian", "paulo"],
};

export function findF1EventUrl(raceName: string, links: EventLink[]): string | null {
  const normalized = raceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const alias = SLUG_WORD_ALIASES[normalized];
  const keywords = alias
    ? alias
    : normalized
        .replace(/grand prix/, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3);

  const matches = links.filter((link) => {
    const slugWords = link.slug.toLowerCase().split("-");
    return keywords.some((k) => slugWords.includes(k));
  });
  return matches.length === 1 ? matches[0]!.url : null;
}

async function findEventUrl(season: number, raceName: string): Promise<string | null> {
  const index = await scrapeF1ResultsIndex(season);
  if (!index.length) return null;
  const url = findF1EventUrl(raceName, index);
  if (!url) {
    await logError({
      source: "scraper/f1",
      severity: "warning",
      message: `No motorsport.com results page match for "${raceName}"`,
    });
  }
  return url;
}

// ─── Results Table Parsing ────────────────────────────────────────────────────

export type MScomSession =
  | "FP1" | "FP2" | "FP3"
  | "Q1" | "Q2" | "Q3" | "CQ"
  | "SQ1" | "SQ2" | "SQ3" | "CSQ"
  | "SPR" | "RACE";

export interface MScomRow {
  /** null for dnf/dns/dsq/nc rows. */
  position: number | null;
  classification: string;
  driverName: string;
  driverSlug: string;
  team: string;
  driverNumber?: number;
  laps?: number;
  /** Time cell lines: P1 has one (its time), others "+gap" then their own time. */
  timeLines: string[];
  points?: number;
  retirement?: string;
}

// motorsport.com writes 1'17.600 and 1:42'00.785; the rest of the app uses colons.
export function normalizeMScomTime(raw: string): string {
  return raw.replace(/'/g, ":");
}

export function parseMScomTable(html: string): MScomRow[] {
  const $ = cheerio.load(html);
  const table = $("table").first();
  if (!table.length) return [];

  const columns = new Map<string, number>();
  table.find("thead th").each((i, th) => {
    const field = ($(th).attr("class") ?? "").match(/ms-table_field--([a-z_]+)/)?.[1];
    if (field) columns.set(field, i);
  });
  for (const required of ["pos", "result_driver_id", "number", "time"]) {
    if (!columns.has(required)) {
      throw new Error(`motorsport.com table layout changed: missing "${required}" column`);
    }
  }

  const rows: MScomRow[] = [];
  table.find("tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    const cell = (field: string) => {
      const i = columns.get(field);
      return i === undefined ? undefined : $(cells[i]);
    };
    const text = (field: string) => cell(field)?.text().replace(/\s+/g, " ").trim() ?? "";

    const classification = text("pos");
    const pos = /^\d+$/.test(classification) ? parseInt(classification, 10) : null;
    const driverCell = cell("result_driver_id")!;
    const driverName = driverCell.find(".name-short").first().text().trim();
    if (!driverName) return;
    const driverHref = driverCell.find("a").first().attr("href") ?? "";

    const timeCell = cell("time")!;
    const ps = timeCell.find("p");
    const timeLines = (ps.length ? ps.toArray().map((p) => $(p).text()) : [timeCell.text()])
      .map((t) => normalizeMScomTime(t.replace(/\s+/g, " ").trim()))
      .filter(Boolean);
    const num = (field: string) => {
      const v = parseFloat(text(field));
      return Number.isFinite(v) ? v : undefined;
    };

    rows.push({
      position: pos,
      classification,
      driverName,
      driverSlug: driverHref.match(/\/driver\/([^/]+)\//)?.[1] ?? driverName.toLowerCase().replace(/\s+/g, "-"),
      team: driverCell.find(".team").first().text().trim(),
      driverNumber: num("number"),
      laps: num("laps"),
      timeLines,
      points: num("points"),
      retirement: text("retirement") || undefined,
    });
  });
  return rows;
}

const PAGE_TTL_MS = 10 * 60 * 1000;
const pageCache = new Map<string, { at: number; rows: unknown[] }>();

async function scrapePage<T>(
  season: number,
  raceName: string,
  st: MScomSession | "TH" | "PT",
  parse: (html: string) => T[]
): Promise<T[]> {
  const url = await findEventUrl(season, raceName);
  if (!url) return [];
  // Without ?st the page shows the latest session, so always name it; an unpublished session has no table.
  const pageUrl = `${url}?st=${st}`;
  const hit = pageCache.get(pageUrl);
  if (hit && Date.now() - hit.at < PAGE_TTL_MS) return hit.rows as T[];
  const rows = parse(await fetchPage(pageUrl));
  // Empty pages are not cached, so a session's results show up on the next sync after publication.
  if (rows.length) pageCache.set(pageUrl, { at: Date.now(), rows });
  return rows;
}

function scrapeSession(season: number, raceName: string, session: MScomSession): Promise<MScomRow[]> {
  return scrapePage(season, raceName, session, parseMScomTable);
}

// ─── Tyre Stints (race only) ──────────────────────────────────────────────────

export interface MScomTyreRow {
  driverNumber: number;
  /** In order. `value` is the stint's laps on a new tyre, but the tyre's total age at stint end on a used one. */
  tyres: Array<{ compound: TireCompound; isNew: boolean; value: number }>;
}

const COMPOUNDS: Record<string, TireCompound> = {
  S: "SOFT",
  M: "MEDIUM",
  H: "HARD",
  I: "INTERMEDIATE",
  W: "WET",
};

function rowNumber($: cheerio.CheerioAPI, tr: Parameters<cheerio.CheerioAPI>[0]): number | null {
  const n = parseInt($(tr).find("td.ms-table_field--number").first().text().trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseMScomTyreHistory(html: string): MScomTyreRow[] {
  const $ = cheerio.load(html);
  const table = $("table").first();
  if (!table.length) return [];
  if (!table.find("thead th.ms-table_field--tyre-history").length) {
    throw new Error('motorsport.com table layout changed: missing "tyre-history" columns');
  }
  const out: MScomTyreRow[] = [];
  table.find("tbody tr").each((_, tr) => {
    const driverNumber = rowNumber($, tr);
    if (driverNumber === null) return;
    const tyres: MScomTyreRow["tyres"] = [];
    $(tr).find("td.ms-table_field--tyre-history").each((_, td) => {
      const label = $(td).find(".label").first();
      const value = parseInt($(td).find(".value").first().text().trim(), 10);
      if (!label.length || !Number.isFinite(value)) return;
      // motorsport.com marks a new tyre by rendering its label in <strong>.
      const isNew = label.is("strong");
      tyres.push({ compound: COMPOUNDS[label.text().trim().toUpperCase()] ?? "UNKNOWN", isNew, value });
    });
    if (tyres.length) out.push({ driverNumber, tyres });
  });
  return out;
}

export function parseMScomPitLaps(html: string): Array<{ driverNumber: number; lap: number }> {
  const $ = cheerio.load(html);
  const table = $("table").first();
  if (!table.length) return [];
  if (!table.find("thead th.ms-table_field--lap").length) {
    throw new Error('motorsport.com table layout changed: missing "lap" column');
  }
  const out: Array<{ driverNumber: number; lap: number }> = [];
  table.find("tbody tr").each((_, tr) => {
    const driverNumber = rowNumber($, tr);
    const lap = parseInt($(tr).find("td.ms-table_field--lap").first().text().trim(), 10);
    if (driverNumber !== null && Number.isFinite(lap)) out.push({ driverNumber, lap });
  });
  return out;
}

// Pit laps fix the stint boundaries exactly; tyre history only adds compound and new/used.
export function toTireStints(
  tyres: MScomTyreRow[],
  pits: Array<{ driverNumber: number; lap: number }>,
  laps: Map<number, number>
): { stints: TireStint[]; skipped: number[] } {
  const stints: TireStint[] = [];
  const skipped: number[] = [];
  for (const { driverNumber, tyres: set } of tyres) {
    const pitLaps = pits.filter((p) => p.driverNumber === driverNumber).map((p) => p.lap).sort((a, b) => a - b);
    const lastLap = laps.get(driverNumber);
    if (pitLaps.length !== set.length - 1 || !lastLap) {
      skipped.push(driverNumber);
      continue;
    }
    const ends = [...pitLaps, lastLap];
    set.forEach((t, i) => {
      const lapStart = i === 0 ? 1 : ends[i - 1]! + 1;
      const lapEnd = ends[i]!;
      const length = lapEnd - lapStart + 1;
      stints.push({
        driverNumber,
        compound: t.compound,
        lapStart,
        lapEnd,
        tyreAgeAtStart: t.isNew ? 0 : Math.max(0, t.value - length),
      });
    });
  }
  return { stints, skipped };
}

// ─── Session Mappers ──────────────────────────────────────────────────────────

// motorsport.com uses its own driver slugs; the app keys on Jolpica ids, so match by car number.
function rosterLookup(roster: Driver[]) {
  const byNumber = new Map<number, Driver>();
  for (const d of roster) if (d.number != null) byNumber.set(d.number, d);
  return (r: MScomRow) => {
    const d = r.driverNumber != null ? byNumber.get(r.driverNumber) : undefined;
    return {
      rosterId: d?.id,
      driverId: d?.id ?? r.driverSlug,
      driverName: d ? `${d.firstName} ${d.lastName}`.trim() : r.driverName,
      driverCode: d?.code,
      team: d?.team ?? r.team,
    };
  };
}

function withoutRosterId<T extends { rosterId?: string }>({ rosterId: _, ...rest }: T): Omit<T, "rosterId"> {
  return rest;
}

function gapOf(r: MScomRow): string | undefined {
  return r.timeLines[0]?.startsWith("+") ? r.timeLines[0] : undefined;
}

function lapOf(r: MScomRow): string | undefined {
  return r.timeLines[r.timeLines.length - 1];
}

export function toPracticeResults(rows: MScomRow[], roster: Driver[]): PracticeDriverResult[] {
  const who = rosterLookup(roster);
  return rows
    .filter((r) => r.position !== null && lapOf(r))
    .map((r) => {
      const d = who(r);
      return {
        position: r.position!,
        driverNumber: r.driverNumber,
        // The row links to /drivers/<id>; a motorsport.com slug there would be a dead link.
        driverId: d.rosterId,
        driverName: d.driverName,
        driverCode: d.driverCode,
        team: d.team || undefined,
        lapTime: lapOf(r)!,
        gap: gapOf(r),
      };
    });
}

// Q1/Q2/Q3 tables carry per-part times; the combined table (CQ/CSQ) carries the final order.
export function toQualifyingResults(
  combined: MScomRow[],
  parts: [MScomRow[], MScomRow[], MScomRow[]],
  roster: Driver[]
): QualifyingDriverResult[] {
  const who = rosterLookup(roster);
  const [q1, q2, q3] = parts.map((rows) => {
    const byNumber = new Map<number, string>();
    for (const r of rows) {
      const lap = lapOf(r);
      if (r.driverNumber != null && r.position !== null && lap) byNumber.set(r.driverNumber, lap);
    }
    return byNumber;
  });

  return combined.map((r, i) => {
    const n = r.driverNumber;
    return {
      position: i + 1,
      ...withoutRosterId(who(r)),
      q1: n != null ? q1!.get(n) : undefined,
      q2: n != null ? q2!.get(n) : undefined,
      q3: n != null ? q3!.get(n) : undefined,
    };
  });
}

const OUT_STATUS: Record<string, string> = {
  dnf: "Retired",
  dns: "Did not start",
  dsq: "Disqualified",
  nc: "Not classified",
};

export function toRaceResults(rows: MScomRow[], roster: Driver[]): RaceResult[] {
  const who = rosterLookup(roster);
  // Table order is the classification: a classified retirement shows "dnf" in its finishing slot.
  return rows.map((r, i) => {
    const position = i + 1;
    const out = r.position === null ? OUT_STATUS[r.classification.toLowerCase()] ?? "Retired" : null;
    const first = r.timeLines[0];
    const lapGap = first?.match(/^\+(\d+) Laps?$/i);
    const gap = lapGap ? `+${lapGap[1]} ${lapGap[1] === "1" ? "Lap" : "Laps"}` : gapOf(r);
    return {
      position,
      ...withoutRosterId(who(r)),
      driverNumber: r.driverNumber,
      time: position === 1 ? first : undefined,
      gap: position === 1 || out ? undefined : gap,
      points: r.points ?? 0,
      status: out ?? "Finished",
      laps: r.laps,
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function guarded<T>(label: string, run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch (err) {
    await logError({
      source: "scraper/f1",
      severity: "warning",
      message: `${label}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return [];
  }
}

export function scrapeF1RaceResults(season: number, raceName: string, roster: Driver[]): Promise<RaceResult[]> {
  return guarded(`${raceName} RACE`, async () => toRaceResults(await scrapeSession(season, raceName, "RACE"), roster));
}

export function scrapeF1SprintResults(season: number, raceName: string, roster: Driver[]): Promise<RaceResult[]> {
  return guarded(`${raceName} SPR`, async () => toRaceResults(await scrapeSession(season, raceName, "SPR"), roster));
}

export function scrapeF1PracticeResults(
  season: number,
  raceName: string,
  session: "FP1" | "FP2" | "FP3",
  roster: Driver[]
): Promise<PracticeDriverResult[]> {
  return guarded(`${raceName} ${session}`, async () =>
    toPracticeResults(await scrapeSession(season, raceName, session), roster)
  );
}

export function scrapeF1QualifyingResults(
  season: number,
  raceName: string,
  sprint: boolean,
  roster: Driver[]
): Promise<QualifyingDriverResult[]> {
  const [combined, p1, p2, p3] = sprint
    ? (["CSQ", "SQ1", "SQ2", "SQ3"] as const)
    : (["CQ", "Q1", "Q2", "Q3"] as const);
  return guarded(`${raceName} ${combined}`, async () => {
    const rows = await scrapeSession(season, raceName, combined);
    if (!rows.length) return [];
    const parts: [MScomRow[], MScomRow[], MScomRow[]] = [
      await scrapeSession(season, raceName, p1),
      await scrapeSession(season, raceName, p2),
      await scrapeSession(season, raceName, p3),
    ];
    return toQualifyingResults(rows, parts, roster);
  });
}

export function scrapeF1RaceStints(season: number, raceName: string): Promise<TireStint[]> {
  return guarded(`${raceName} TH`, async () => {
    const tyres = await scrapePage(season, raceName, "TH", parseMScomTyreHistory);
    if (!tyres.length) return [];
    const pits = await scrapePage(season, raceName, "PT", parseMScomPitLaps);
    const race = await scrapeSession(season, raceName, "RACE");
    const laps = new Map(race.flatMap((r) => (r.driverNumber != null && r.laps != null ? [[r.driverNumber, r.laps] as const] : [])));
    const { stints, skipped } = toTireStints(tyres, pits, laps);
    if (skipped.length) {
      await logError({
        source: "scraper/f1",
        severity: "warning",
        message: `${raceName} TH: pit stops do not match tyre history for car(s) ${skipped.join(", ")}`,
      });
      // A partial set would win over OpenF1's full one, so hand over instead.
      return [];
    }
    return stints;
  });
}

export async function isMScomF1RaceFinished(
  season: number,
  raceName: string
): Promise<boolean> {
  try {
    const rows = await scrapeSession(season, raceName, "RACE");
    return rows.filter((r) => r.position !== null).length >= 10;
  } catch {
    return false;
  }
}
