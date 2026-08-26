import { unstable_cache } from "next/cache";
import type { Race, RaceDetail, RaceResult, PracticeDriverResult } from "@/types/series";
import { getCachedRaceDetail, getRaceDetailRaw, setCachedRaceDetail } from "@/lib/cache";
import {
  jolpicaFetchPitStops,
  jolpicaFetchRoundDriverStandings,
  jolpicaFetchRoundTeamStandings,
  jolpicaFetchQualifyingResults,
  jolpicaFetchSprintResults,
} from "@/lib/adapters/f1/jolpica";
import {
  findOpenF1AllSessionKeys,
  fetchOpenF1Stints,
  fetchOpenF1RaceControl,
  fetchOpenF1PracticeResults,
} from "@/lib/adapters/f1/openf1";
import { fetchRaceWeather } from "@/lib/weather";
import { translateRaceControlMessages } from "@/lib/gemini";
import { logError } from "@/lib/error-log";

const SESSION_WINDOW_MS: Record<string, number> = {
  practice1: 3 * 60 * 60 * 1000,
  practice2: 3 * 60 * 60 * 1000,
  practice3: 3 * 60 * 60 * 1000,
  qualifying: 2 * 60 * 60 * 1000,
  sprintQuali: 2 * 60 * 60 * 1000,
  sprint: 4 * 60 * 60 * 1000,
  race: 4 * 60 * 60 * 1000,
};

const EMPTY_DETAIL: RaceDetail = {
  pitStops: [],
  tireStints: [],
  raceControl: [],
  raceControlTr: [],
  driverStandingsAfter: [],
  teamStandingsAfter: [],
  weather: [],
  qualifyingResults: [],
  sprintResults: [],
  practice1Results: [],
  practice2Results: [],
  practice3Results: [],
};

function buildNumberToDriverIdMap(sources: RaceResult[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of sources) {
    if (r.driverNumber != null) map.set(r.driverNumber, r.driverId);
  }
  return map;
}

function attachDriverIds(
  results: PracticeDriverResult[],
  numberToDriverId: Map<number, string>
): PracticeDriverResult[] {
  return results.map((r) => ({
    ...r,
    driverId: r.driverNumber != null ? numberToDriverId.get(r.driverNumber) : undefined,
  }));
}

export function isActiveRaceWeekend(race: Race): boolean {
  const now = Date.now();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const firstSession = race.sessions[0];
  if (!firstSession) return false;
  const firstSessionTime = new Date(firstSession.date).getTime();
  const raceTime = new Date(race.date).getTime();
  return firstSessionTime <= now + TWO_DAYS_MS && raceTime > now - 4 * 60 * 60 * 1000;
}

// Sadece DB'den okur — canlı OpenF1/Jolpica fetch YOK. Veri tazeliği tamamen
// arka plan cron'una ait: syncRaceDetails() (6 saatte bir), syncPendingRaceControl()
// ve syncActiveSessionData() (session-sync, 2 dakikada bir) bu detayları besliyor.
// Önceden burada TTL/eksik-alan kontrolüyle sayfa açılışında canlı fetch tetikleniyordu —
// art arda farklı yarış sayfalarına bakan bir kullanıcı için her seferinde 5-6 eşzamanlı
// OpenF1 isteği anlamına geliyordu. Artık sayfa hiçbir zaman kendi fetch tetiklemiyor;
// cron henüz yetişmediyse kullanıcı geçici olarak eksik/boş veri görür, bir sonraki
// cron cycle'ında (veya syncPendingRaceControl'ün kısa aralığında) dolar.
//
// unstable_cache (istekler arası kalıcı) — session-sync'in 2 dakikalık ritmine
// yakın bir pencere seçildi, art arda birkaç yarış sayfası arasında gezinme artık
// Postgres'e her seferinde gitmiyor.
export const getRaceDetail = unstable_cache(
  async (slug: string, season: number, round: number): Promise<RaceDetail> => {
    const cached = await getRaceDetailRaw(slug, season, round);
    return cached ?? EMPTY_DETAIL;
  },
  ["race-detail"],
  { revalidate: 60 }
);

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

      // raceControlFetched !== true → önceki fetch OpenF1'den veri alamadı, tekrar dene
      if (!raw.raceControlFetched) {
        const fresh = await fetchF1RaceDetail(season, race.round, race, true);
        if (fresh.raceControl.length > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          const translated = await translateRaceControlMessages(
            fresh.raceControl.map((e) => e.message)
          );
          await setCachedRaceDetail(slug, season, race.round, {
            ...raw,
            ...fresh,
            raceControlTr: translated,
          });
          synced++;
        }
        continue;
      }

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

  // Pass 2 — son 14 gün + live: tam veri yenileme
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentRaces = completedRaces.filter(
    (r) => r.status === "live" || new Date(r.date).getTime() > fourteenDaysAgo
  );

  for (const race of recentRaces) {
    try {
      const isCompleted = race.status === "completed";

      // Fetch existing raw detail upfront — used for translation check and preserving completion flags
      const rawDetail = await getRaceDetailRaw(slug, season, race.round);

      // Yarışta olan bir practice session'ın sonucu boşsa → hiç çekilmemiş → tam yenilemeye düş
      const missingPracticeData =
        isCompleted &&
        rawDetail !== null &&
        race.sessions.some(
          (s) =>
            (s.type === "practice1" && (rawDetail.practice1Results ?? []).length === 0) ||
            (s.type === "practice2" && (rawDetail.practice2Results ?? []).length === 0) ||
            (s.type === "practice3" && (rawDetail.practice3Results ?? []).length === 0)
        );
      // Aynı getRaceDetail()'in cacheValid'i gibi: stint ve sprint verisi de "tamamen
      // fetch edildi" sayılmak için ayrıca kontrol edilmeli, sadece practice değil.
      const missingStintsData = isCompleted && rawDetail !== null && !rawDetail.stintsFetched;
      const hasSprintSession = race.sessions.some((s) => s.type === "sprint");
      const missingSprintResults =
        isCompleted && hasSprintSession && rawDetail !== null && !rawDetail.sprintComplete;

      // Tamamlanmış yarış ve TÜM veri (sonuçlar, standings, stint, practice, sprint,
      // race control) zaten DB'de duruyorsa → sadece çeviri kontrol et (API fetch yapma).
      // raceControl.length>0 şartı YOK: temiz bir yarışta (bayrak/olay yok — chequered flag
      // dahil, isNotableRaceControlEvent() bunu "notable" saymıyor) raceControl hep boş
      // dönüyor ama bu, fetch'in başarısız olduğu anlamına gelmiyor — length şartı olsaydı
      // böyle bir yarış her 6 saatlik full sync'te sonsuza dek yeniden OpenF1'e (5 eşzamanlı
      // istek) çekilirdi, sırf olay yok diye.
      if (isCompleted) {
        if (
          rawDetail?.raceControlFetched === true &&
          !missingPracticeData &&
          !missingStintsData &&
          !missingSprintResults
        ) {
          const needsTr =
            rawDetail.raceControl.length > 0 &&
            (!rawDetail.raceControlTr?.length ||
              rawDetail.raceControlTr[0] === rawDetail.raceControl[0]?.message);
          if (needsTr) {
            await new Promise((r) => setTimeout(r, 2000));
            const translated = await translateRaceControlMessages(
              rawDetail.raceControl.map((e) => e.message)
            );
            if (translated.length) {
              await setCachedRaceDetail(slug, season, race.round, {
                ...rawDetail,
                raceControlTr: translated,
              });
              synced++;
            }
          }
          continue;
        }
      }

      // Veri eksik veya live yarış → tam re-fetch
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

      // Preserve completion flags set by active session sync — fresh fetch only sets
      // qualifyingComplete and sprintComplete; the rest come from syncActiveSessionData
      await setCachedRaceDetail(slug, season, race.round, {
        ...fresh,
        raceControlTr,
        qualifyingComplete: fresh.qualifyingComplete ?? rawDetail?.qualifyingComplete,
        sprintQualiComplete: rawDetail?.sprintQualiComplete,
        practice1Complete: rawDetail?.practice1Complete,
        practice2Complete: rawDetail?.practice2Complete,
        practice3Complete: rawDetail?.practice3Complete,
        raceDataComplete: rawDetail?.raceDataComplete ?? fresh.raceDataComplete,
      });
      synced++;
    } catch (err) {
      errors.push(`round ${race.round}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { synced, errors };
}

export async function syncActiveSessionData(
  slug: string,
  season: number,
  race: Race
): Promise<void> {
  if (slug !== "f1") return;

  const now = Date.now();
  const existing = (await getRaceDetailRaw(slug, season, race.round)) ?? { ...EMPTY_DETAIL };

  const activeSessions = race.sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    if (t > now) return false;
    const windowMs = SESSION_WINDOW_MS[s.type] ?? 4 * 60 * 60 * 1000;
    if (now > t + windowMs) return false;
    if (s.type === "practice1" && existing.practice1Complete) return false;
    if (s.type === "practice2" && existing.practice2Complete) return false;
    if (s.type === "practice3" && existing.practice3Complete) return false;
    if (s.type === "qualifying" && existing.qualifyingComplete) return false;
    if (s.type === "sprintQuali" && existing.sprintQualiComplete) return false;
    if (s.type === "race" && existing.raceDataComplete) return false;
    if (s.type === "sprint" && existing.sprintComplete) return false;
    return true;
  });

  if (!activeSessions.length) return;

  const numberToDriverId = buildNumberToDriverIdMap([
    ...(race.results ?? []),
    ...(existing.sprintResults ?? []),
  ]);

  const of1Types = new Set(["practice1", "practice2", "practice3", "race", "sprint"]);
  const of1Sessions = activeSessions.filter((s) => of1Types.has(s.type));
  const sessionKeyMap =
    of1Sessions.length > 0
      ? await findOpenF1AllSessionKeys(season, of1Sessions)
      : new Map<string, number>();

  const updated = { ...existing };
  let changed = false;

  for (const session of activeSessions) {
    const type = session.type;
    try {
      if (type === "practice1" || type === "practice2" || type === "practice3") {
        const sessionKey = sessionKeyMap.get(type);
        if (!sessionKey) continue;

        const results = attachDriverIds(await fetchOpenF1PracticeResults(sessionKey), numberToDriverId);
        if (type === "practice1") { updated.practice1Results = results; if (results.length >= 15) updated.practice1Complete = true; }
        if (type === "practice2") { updated.practice2Results = results; if (results.length >= 15) updated.practice2Complete = true; }
        if (type === "practice3") { updated.practice3Results = results; if (results.length >= 15) updated.practice3Complete = true; }
        changed = true;
        console.log(`[cron] session sync: ${slug} R${race.round} ${type} (${results.length} drivers, complete: ${results.length >= 15})`);
      }

      if (type === "qualifying") {
        const results = await jolpicaFetchQualifyingResults(season, race.round);
        updated.qualifyingResults = results;
        const q3Count = results.filter((r) => r.q3).length;
        if (q3Count >= 9) updated.qualifyingComplete = true;
        changed = true;
        console.log(`[cron] session sync: ${slug} R${race.round} qualifying (Q3 drivers: ${q3Count})`);
      }

      if (type === "sprintQuali") {
        const results = await jolpicaFetchQualifyingResults(season, race.round);
        updated.qualifyingResults = results;
        const q1Count = results.filter((r) => r.q1).length;
        if (q1Count >= 15) updated.sprintQualiComplete = true;
        changed = true;
        console.log(`[cron] session sync: ${slug} R${race.round} sprintQuali (Q1 drivers: ${q1Count})`);
      }

      if (type === "sprint") {
        const sprintResults = await jolpicaFetchSprintResults(season, race.round);
        if (sprintResults.length > 0) {
          updated.sprintResults = sprintResults;
          if (sprintResults.length >= 18) updated.sprintComplete = true;
        }
        // Also pull live OpenF1 data while sprint is ongoing
        if (!updated.sprintComplete) {
          const sessionKey = sessionKeyMap.get("sprint");
          if (sessionKey) {
            const [stints, raceControl] = await Promise.all([
              fetchOpenF1Stints(sessionKey),
              fetchOpenF1RaceControl(sessionKey),
            ]);
            updated.tireStints = stints;
            const hasNewEvents = raceControl.length > updated.raceControl.length;
            updated.raceControl = raceControl;
            if (hasNewEvents && raceControl.length > 0) {
              const translated = await translateRaceControlMessages(
                raceControl.map((e) => e.message)
              );
              if (translated.length) updated.raceControlTr = translated;
            }
          }
        }
        console.log(`[cron] session sync: ${slug} R${race.round} sprint (results: ${sprintResults.length}, complete: ${!!updated.sprintComplete})`);
        changed = true;
      }

      if (type === "race") {
        if (race.results && race.results.length >= 18) {
          const fresh = await fetchF1RaceDetail(season, race.round, race, true);
          const existingTr = updated.raceControlTr ?? [];
          let raceControlTr = existingTr;

          if (fresh.raceControl.length > 0) {
            const needsTr =
              !existingTr.length ||
              fresh.raceControl.length > updated.raceControl.length;
            if (needsTr) {
              await new Promise((r) => setTimeout(r, 2000));
              const translated = await translateRaceControlMessages(
                fresh.raceControl.map((e) => e.message)
              );
              if (translated.length) raceControlTr = translated;
            }
          }

          Object.assign(updated, { ...fresh, raceControlTr });
          updated.raceDataComplete = true;
          console.log(`[cron] session sync: ${slug} R${race.round} race COMPLETE`);
        } else {
          const sessionKey = sessionKeyMap.get("race");
          if (sessionKey) {
            const [stints, raceControl] = await Promise.all([
              fetchOpenF1Stints(sessionKey),
              fetchOpenF1RaceControl(sessionKey),
            ]);
            updated.tireStints = stints;
            const hasNewEvents = raceControl.length > updated.raceControl.length;
            updated.raceControl = raceControl;
            if (hasNewEvents && raceControl.length > 0) {
              const translated = await translateRaceControlMessages(
                raceControl.map((e) => e.message)
              );
              if (translated.length) updated.raceControlTr = translated;
            }
          }
          console.log(`[cron] session sync: ${slug} R${race.round} race live (results: ${race.results?.length ?? 0})`);
        }
        changed = true;
      }
    } catch (err) {
      logError({ source: "race-detail/sync-active-session", severity: "error", message: `${slug} R${race.round} ${type}: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  if (changed) {
    await setCachedRaceDetail(slug, season, race.round, updated);
  }
}

const RACE_CONTROL_CATCHUP_WINDOW_MS = 6 * 60 * 60 * 1000;

// Yarış bitip aktif hafta sonu penceresi (isActiveRaceWeekend) kapandıktan sonra da
// race control verisi hâlâ eksikse (OpenF1 gecikmeli yayınlamış/geçici hata olmuş olabilir)
// kullanıcı sayfayı açmadan, arka planda kısa aralıklarla denemeye devam eder.
// raceControlFetched true olan yarışlar hemen atlanır — gerçek iş sadece eksik olanda yapılır.
export async function syncPendingRaceControl(
  slug: string,
  season: number,
  races: Race[]
): Promise<void> {
  if (slug !== "f1") return;

  const now = Date.now();
  const pending = races.filter(
    (r) => r.status === "completed" && now - new Date(r.date).getTime() < RACE_CONTROL_CATCHUP_WINDOW_MS
  );

  for (const race of pending) {
    try {
      const raw = await getRaceDetailRaw(slug, season, race.round);
      if (raw?.raceControlFetched === true) continue;

      const fresh = await fetchF1RaceDetail(season, race.round, race, true);
      if (!fresh.raceControlFetched) continue;

      if (fresh.raceControl.length > 0) {
        const translated = await translateRaceControlMessages(
          fresh.raceControl.map((e) => e.message)
        );
        if (translated.length) fresh.raceControlTr = translated;
      }

      await setCachedRaceDetail(slug, season, race.round, { ...raw, ...fresh });
    } catch (err) {
      logError({
        source: "race-detail/syncPendingRaceControl",
        severity: "warning",
        message: `${slug} R${race.round}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
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

  const sprintSession = race.sessions.find((s) => s.type === "sprint");
  const qualifyingDone = qualifyingSession ? new Date(qualifyingSession.date) < now : false;
  const sprintDone = sprintSession ? new Date(sprintSession.date) < now : false;
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
    sprintResult,
    sessionKeyMapResult,
  ] = await Promise.allSettled([
    isCompleted ? jolpicaFetchPitStops(season, round) : Promise.resolve([]),
    !isCompleted && race.circuitLat && race.circuitLng
      ? fetchRaceWeather(race.circuitLat, race.circuitLng, race.date)
      : Promise.resolve([]),
    isCompleted ? jolpicaFetchRoundDriverStandings(season, round) : Promise.resolve([]),
    isCompleted ? jolpicaFetchRoundTeamStandings(season, round) : Promise.resolve([]),
    qualifyingDone ? jolpicaFetchQualifyingResults(season, round) : Promise.resolve([]),
    sprintDone ? jolpicaFetchSprintResults(season, round) : Promise.resolve([]),
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
  // raceControl boş dönebilir (olay yoksa) ama bu, başarılı bir fetch'ten ayırt edilmeli —
  // yoksa cacheValid hep false kalır ve her sayfa yüklemesi OpenF1'i yeniden çeker.
  const raceControlFetchSucceeded = raceSessionKey !== null && raceControlResult.status === "fulfilled";
  if (isCompleted && raceSessionKey === null) {
    await logError({
      source: "race-detail/fetchF1RaceDetail",
      severity: "warning",
      message: `OpenF1 race session key not found for season ${season} round ${round}`,
    });
  } else if (isCompleted && raceControlResult.status === "rejected") {
    await logError({
      source: "race-detail/fetchF1RaceDetail",
      severity: "warning",
      message: `race control fetch failed for season ${season} round ${round}: ${
        raceControlResult.reason instanceof Error ? raceControlResult.reason.message : String(raceControlResult.reason)
      }`,
    });
  }

  const qualifyingResults =
    qualifyingResult.status === "fulfilled" ? qualifyingResult.value : [];
  const q3Count = qualifyingResults.filter((r) => r.q3).length;

  const sprintResultsForMap = sprintResult.status === "fulfilled" ? sprintResult.value : [];
  const numberToDriverId = buildNumberToDriverIdMap([
    ...(race.results ?? []),
    ...sprintResultsForMap,
  ]);

  return {
    pitStops: enrichedPitStops,
    tireStints: stintsResult.status === "fulfilled" ? stintsResult.value : [],
    raceControl,
    raceControlTr: [],
    driverStandingsAfter,
    teamStandingsAfter:
      teamStandingsResult.status === "fulfilled" ? teamStandingsResult.value : [],
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : [],
    qualifyingResults,
    qualifyingComplete: q3Count >= 9 ? true : undefined,
    sprintResults:
      sprintResult.status === "fulfilled" ? sprintResult.value : [],
    sprintComplete:
      sprintResult.status === "fulfilled" && sprintResult.value.length >= 18 ? true : undefined,
    practice1Results: attachDriverIds(fp1Result.status === "fulfilled" ? fp1Result.value : [], numberToDriverId),
    practice2Results: attachDriverIds(fp2Result.status === "fulfilled" ? fp2Result.value : [], numberToDriverId),
    practice3Results: attachDriverIds(fp3Result.status === "fulfilled" ? fp3Result.value : [], numberToDriverId),
    raceControlFetched: isCompleted && raceControlFetchSucceeded,
    stintsFetched: isCompleted,
  };
}
