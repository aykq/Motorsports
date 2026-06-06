import type { Race, RaceDetail } from "@/types/series";
import { getCachedRaceDetail, getRaceDetailRaw, setCachedRaceDetail } from "@/lib/cache";
import {
  jolpicaFetchPitStops,
  jolpicaFetchRoundDriverStandings,
  jolpicaFetchRoundTeamStandings,
  jolpicaFetchQualifyingResults,
} from "@/lib/adapters/f1/jolpica";
import {
  findOpenF1AllSessionKeys,
  fetchOpenF1Stints,
  fetchOpenF1RaceControl,
  fetchOpenF1PracticeResults,
} from "@/lib/adapters/f1/openf1";
import { fetchRaceWeather } from "@/lib/weather";
import { translateRaceControlMessages } from "@/lib/gemini";

const EMPTY_DETAIL: RaceDetail = {
  pitStops: [],
  tireStints: [],
  raceControl: [],
  raceControlTr: [],
  driverStandingsAfter: [],
  teamStandingsAfter: [],
  weather: [],
  qualifyingResults: [],
  practice1Results: [],
  practice2Results: [],
  practice3Results: [],
};

function isActiveRaceWeekend(race: Race): boolean {
  const now = Date.now();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const firstSession = race.sessions[0];
  if (!firstSession) return false;
  const firstSessionTime = new Date(firstSession.date).getTime();
  const raceTime = new Date(race.date).getTime();
  return firstSessionTime <= now + TWO_DAYS_MS && raceTime > now - 4 * 60 * 60 * 1000;
}

export async function getRaceDetail(
  slug: string,
  season: number,
  round: number,
  race: Race
): Promise<RaceDetail> {
  const isCompleted = race.status === "completed";
  const activeWeekend = !isCompleted && isActiveRaceWeekend(race);

  const cached = await getCachedRaceDetail(slug, season, round, isCompleted, race.date, activeWeekend);
  // qualifyingResults === undefined → eski cache kaydı (yeni alanlar yok), yeniden çek
  // raceControlFetched === undefined → raceControl hiç API'den çekilmedi, yeniden çek
  const cacheValid =
    cached !== null &&
    cached.qualifyingResults !== undefined &&
    (!isCompleted || cached.raceControlFetched === true);
  if (cacheValid) return cached;

  if (slug !== "f1") return EMPTY_DETAIL;

  const detail = await fetchF1RaceDetail(season, round, race, isCompleted);

  if (isCompleted && detail.raceControl.length > 0) {
    const stale = await getRaceDetailRaw(slug, season, round);
    if (stale?.raceControlTr?.length === detail.raceControl.length) {
      detail.raceControlTr = stale.raceControlTr;
    }
    // Stale çeviri yoksa inline çevir (ilk yüklemede Gemini çağrısı)
    if (!detail.raceControlTr.length) {
      const translated = await translateRaceControlMessages(
        detail.raceControl.map((e) => e.message)
      );
      if (translated.length) detail.raceControlTr = translated;
    }
  }

  await setCachedRaceDetail(slug, season, round, detail);

  return detail;
}

export async function syncRaceDetails(
  slug: string,
  season: number,
  races: Race[]
): Promise<{ synced: number; errors: string[] }> {
  if (slug !== "f1") return { synced: 0, errors: [] };

  const errors: string[] = [];
  let synced = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const completedRaces = races.filter((r) => r.status === "completed" || r.status === "live");

  // Pass 1 — eski yarışlar: sadece DB'den çeviri backfill (fresh API fetch yok)
  for (const race of completedRaces) {
    const isRecent = new Date(race.date).getTime() > sevenDaysAgo;
    if (isRecent || race.status === "live") continue;

    try {
      const raw = await getRaceDetailRaw(slug, season, race.round);
      if (!raw) continue;

      const needsTr =
        raw.raceControl.length > 0 &&
        (!raw.raceControlTr?.length ||
          raw.raceControlTr[0] === raw.raceControl[0]?.message);
      if (!needsTr) continue;

      await new Promise((r) => setTimeout(r, 2000));
      const translated = await translateRaceControlMessages(
        raw.raceControl.map((e) => e.message)
      );
      if (translated.length) {
        await setCachedRaceDetail(slug, season, race.round, {
          ...raw,
          raceControlTr: translated,
        });
        synced++;
      }
    } catch (err) {
      errors.push(`round ${race.round} (backfill): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Pass 2 — son 7 gün + live: tam veri yenileme
  const recentRaces = completedRaces.filter(
    (r) => r.status === "live" || new Date(r.date).getTime() > sevenDaysAgo
  );

  for (const race of recentRaces) {
    try {
      const isCompleted = race.status === "completed";
      const existing = await getCachedRaceDetail(slug, season, race.round, isCompleted);
      const fresh = await fetchF1RaceDetail(season, race.round, race, isCompleted);

      const existingTr = existing?.raceControlTr ?? [];
      const trIsEmpty = existingTr.length === 0 && fresh.raceControl.length > 0;
      const trIsBad =
        existingTr.length > 0 &&
        fresh.raceControl.length > 0 &&
        existingTr[0] === fresh.raceControl[0]?.message;
      const hasNewEvents = fresh.raceControl.length > (existing?.raceControl.length ?? 0);

      let raceControlTr = existingTr;

      if (hasNewEvents || trIsEmpty || trIsBad) {
        await new Promise((r) => setTimeout(r, 2000));
        const translated = await translateRaceControlMessages(
          fresh.raceControl.map((e) => e.message)
        );
        if (translated.length) raceControlTr = translated;
      }

      await setCachedRaceDetail(slug, season, race.round, { ...fresh, raceControlTr });
      synced++;
    } catch (err) {
      errors.push(`round ${race.round}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { synced, errors };
}

async function fetchF1RaceDetail(
  season: number,
  round: number,
  race: Race,
  isCompleted: boolean
): Promise<RaceDetail> {
  const now = new Date();

  const raceSession = race.sessions.find((s) => s.type === "race");
  const qualifyingSession = race.sessions.find((s) => s.type === "qualifying");
  const fp1Session = race.sessions.find((s) => s.type === "practice1");
  const fp2Session = race.sessions.find((s) => s.type === "practice2");
  const fp3Session = race.sessions.find((s) => s.type === "practice3");

  const qualifyingDone = qualifyingSession ? new Date(qualifyingSession.date) < now : false;
  const fp1Done = fp1Session ? new Date(fp1Session.date) < now : false;
  const fp2Done = fp2Session ? new Date(fp2Session.date) < now : false;
  const fp3Done = fp3Session ? new Date(fp3Session.date) < now : false;

  // OpenF1'de anahtar aranacak seanslar
  const sessionsToFind = [
    ...(isCompleted && raceSession ? [raceSession] : []),
    ...(fp1Done && fp1Session ? [fp1Session] : []),
    ...(fp2Done && fp2Session ? [fp2Session] : []),
    ...(fp3Done && fp3Session ? [fp3Session] : []),
  ];

  const [
    pitStopsResult,
    weatherResult,
    driverStandingsResult,
    teamStandingsResult,
    qualifyingResult,
    sessionKeyMapResult,
  ] = await Promise.allSettled([
    isCompleted ? jolpicaFetchPitStops(season, round) : Promise.resolve([]),
    !isCompleted && race.circuitLat && race.circuitLng
      ? fetchRaceWeather(race.circuitLat, race.circuitLng, race.date)
      : Promise.resolve([]),
    isCompleted ? jolpicaFetchRoundDriverStandings(season, round) : Promise.resolve([]),
    isCompleted ? jolpicaFetchRoundTeamStandings(season, round) : Promise.resolve([]),
    qualifyingDone ? jolpicaFetchQualifyingResults(season, round) : Promise.resolve([]),
    sessionsToFind.length > 0
      ? findOpenF1AllSessionKeys(season, sessionsToFind)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const sessionKeyMap =
    sessionKeyMapResult.status === "fulfilled"
      ? sessionKeyMapResult.value
      : new Map<string, number>();

  const raceSessionKey = sessionKeyMap.get("race") ?? null;
  const fp1Key = sessionKeyMap.get("practice1") ?? null;
  const fp2Key = sessionKeyMap.get("practice2") ?? null;
  const fp3Key = sessionKeyMap.get("practice3") ?? null;

  const [stintsResult, raceControlResult, fp1Result, fp2Result, fp3Result] =
    await Promise.allSettled([
      raceSessionKey ? fetchOpenF1Stints(raceSessionKey) : Promise.resolve([]),
      raceSessionKey ? fetchOpenF1RaceControl(raceSessionKey) : Promise.resolve([]),
      fp1Key ? fetchOpenF1PracticeResults(fp1Key) : Promise.resolve([]),
      fp2Key ? fetchOpenF1PracticeResults(fp2Key) : Promise.resolve([]),
      fp3Key ? fetchOpenF1PracticeResults(fp3Key) : Promise.resolve([]),
    ]);

  const pitStops = pitStopsResult.status === "fulfilled" ? pitStopsResult.value : [];
  const driverStandingsAfter =
    driverStandingsResult.status === "fulfilled" ? driverStandingsResult.value : [];

  const driverNameMap = new Map(
    (race.results ?? []).map((r) => [r.driverId, r.driverName])
  );
  const enrichedPitStops = pitStops.map((p) => ({
    ...p,
    driverName: driverNameMap.get(p.driverId) ?? p.driverId,
  }));

  const raceControl = raceControlResult.status === "fulfilled" ? raceControlResult.value : [];

  return {
    pitStops: enrichedPitStops,
    tireStints: stintsResult.status === "fulfilled" ? stintsResult.value : [],
    raceControl,
    raceControlTr: [],
    driverStandingsAfter,
    teamStandingsAfter:
      teamStandingsResult.status === "fulfilled" ? teamStandingsResult.value : [],
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : [],
    qualifyingResults:
      qualifyingResult.status === "fulfilled" ? qualifyingResult.value : [],
    practice1Results: fp1Result.status === "fulfilled" ? fp1Result.value : [],
    practice2Results: fp2Result.status === "fulfilled" ? fp2Result.value : [],
    practice3Results: fp3Result.status === "fulfilled" ? fp3Result.value : [],
    raceControlFetched: true,
  };
}
