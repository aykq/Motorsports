"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PracticeSection, type PracticeLabels } from "@/components/race/PracticeSection";
import { QualifyingSection, type QualifyingLabels } from "@/components/race/QualifyingSection";
import { RaceResultsSection, type RaceLabels } from "@/components/race/RaceResultsSection";
import type {
  PracticeDriverResult,
  QualifyingDriverResult,
  RaceResult,
  TireStint,
  RaceControlEvent,
  Standing,
} from "@/types/series";

type TabType = "practice1" | "practice2" | "practice3" | "sprintQuali" | "sprint" | "qualifying" | "race";

export interface SessionTab {
  type: TabType;
  shortLabel: string;
  fullLabel: string;
}

interface Props {
  tabs: SessionTab[];
  defaultTab: TabType;
  practice1Results: PracticeDriverResult[];
  practice2Results: PracticeDriverResult[];
  practice3Results: PracticeDriverResult[];
  qualifyingResults: QualifyingDriverResult[];
  raceResults: RaceResult[];
  tireStints: TireStint[];
  raceControl: RaceControlEvent[];
  raceControlTr: string[];
  driverStandingsAfter: Standing[];
  teamStandingsAfter: Standing[];
  slug: string;
  practiceLabels: PracticeLabels;
  qualifyingLabels: QualifyingLabels;
  raceLabels: RaceLabels;
}

export function SessionTabs({
  tabs,
  defaultTab,
  practice1Results,
  practice2Results,
  practice3Results,
  qualifyingResults,
  raceResults,
  tireStints,
  raceControl,
  raceControlTr,
  driverStandingsAfter,
  teamStandingsAfter,
  slug,
  practiceLabels,
  qualifyingLabels,
  raceLabels,
}: Props) {
  const [active, setActive] = useState<TabType>(defaultTab);

  if (!tabs.length) return null;

  const activeTab = tabs.find((t) => t.type === active) ?? tabs[tabs.length - 1]!;

  const practiceData: Record<string, PracticeDriverResult[]> = {
    practice1: practice1Results,
    practice2: practice2Results,
    practice3: practice3Results,
  };

  const isPractice = active === "practice1" || active === "practice2" || active === "practice3";

  return (
    <div className="space-y-4">
      {/* Segmented tab bar */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-flex items-center gap-0.5 bg-muted/70 p-1 rounded-xl min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActive(tab.type)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-widest whitespace-nowrap transition-all duration-150",
                active === tab.type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {tab.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isPractice && (
        <PracticeSection
          sessionLabel={activeTab.fullLabel}
          results={practiceData[active] ?? []}
          labels={practiceLabels}
        />
      )}

      {active === "qualifying" && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {qualifyingLabels.qualifyingResults}
          </h2>
          <QualifyingSection
            results={qualifyingResults}
            labels={qualifyingLabels}
          />
        </div>
      )}

      {active === "race" && (
        <RaceResultsSection
          results={raceResults}
          tireStints={tireStints}
          raceControl={raceControl}
          raceControlTr={raceControlTr}
          driverStandingsAfter={driverStandingsAfter}
          teamStandingsAfter={teamStandingsAfter}
          labels={raceLabels}
          slug={slug}
        />
      )}
    </div>
  );
}
