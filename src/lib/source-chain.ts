import type { PracticeDriverResult, QualifyingDriverResult } from "@/types/series";
import { OpenF1NoDataError } from "@/lib/adapters/f1/openf1";

export type ResultSource = "jolpica" | "openf1" | "mscom";
export type SourceStep<T> = readonly [ResultSource, (() => Promise<T[]>) | null];

// With no data anywhere, rethrow a real error over OpenF1's "no data" so alerting still sees it.
export async function firstNonEmpty<T>(
  chain: SourceStep<T>[]
): Promise<{ results: T[]; source: ResultSource | null; succeeded: ResultSource[] }> {
  const succeeded: ResultSource[] = [];
  let failure: unknown = null;
  for (const [source, run] of chain) {
    if (!run) continue;
    try {
      const results = await run();
      succeeded.push(source);
      if (results.length > 0) return { results, source, succeeded };
    } catch (err) {
      if (failure === null || failure instanceof OpenF1NoDataError) failure = err;
    }
  }
  if (failure !== null) throw failure;
  return { results: [], source: null, succeeded };
}

export type CompletableSession = "practice" | "qualifying" | "sprintQuali";

// motorsport.com publishes a session's table only once it ends, so a full scraped table counts as final.
export function isSessionComplete(
  session: CompletableSession,
  source: ResultSource | null,
  results: ReadonlyArray<PracticeDriverResult | QualifyingDriverResult>
): boolean {
  const q3Count = results.filter((r) => "q3" in r && r.q3).length;
  switch (session) {
    case "practice":
      return (source === "openf1" || source === "mscom") && results.length >= 15;
    case "qualifying":
      return source === "jolpica" && q3Count >= 9;
    case "sprintQuali":
      return (source === "openf1" && q3Count >= 9) || (source === "mscom" && results.length >= 15);
  }
}
