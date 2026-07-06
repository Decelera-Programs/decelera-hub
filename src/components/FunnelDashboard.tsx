"use client";

import { useMemo, useState } from "react";
import { ApplicationsOverTimeChart } from "./ApplicationsOverTimeChart";
import { FunnelTable } from "./FunnelTable";
import { QualitySummary } from "./QualitySummary";
import { WeeklyVolumeChart } from "./WeeklyVolumeChart";
import { computeWeek } from "@/lib/transform";
import type { Deal, StageValue } from "@/lib/types";

type WeekOption = "all" | -1 | number;
type StageOption = "all" | StageValue;

function weekLabel(option: WeekOption) {
  if (option === "all") return "Total";
  if (option === -1) return "Pre-opencall";
  return `Semana ${option}`;
}

const STAGE_LABEL: Record<StageOption, string> = {
  all: "Todos",
  "Mexico 2026": "Aplicaciones",
  "Leads Mexico 2026": "Leads",
};

function TabGroup<T extends string | number>({
  options,
  selected,
  onSelect,
  label,
}: {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  label: (value: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-1">
      {options.map((option) => {
        const active = option === selected;
        return (
          <button
            key={String(option)}
            onClick={() => onSelect(option)}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              active
                ? { background: "var(--series-1)", color: "#fff" }
                : { color: "var(--text-secondary)" }
            }
          >
            {label(option)}
          </button>
        );
      })}
    </div>
  );
}

export function FunnelDashboard({ deals }: { deals: Deal[] }) {
  const [selectedWeek, setSelectedWeek] = useState<WeekOption>("all");
  const [selectedStage, setSelectedStage] = useState<StageOption>("all");

  const weekOptions = useMemo<WeekOption[]>(() => {
    const currentWeek = Math.max(0, computeWeek(new Date()).weekIndex ?? 0);
    const dataMaxWeek = Math.max(0, ...deals.map((d) => d.weekIndex ?? 0));
    const lastWeek = Math.max(currentWeek, dataMaxWeek, 1);
    const weeks: WeekOption[] = ["all", -1];
    for (let w = 1; w <= lastWeek; w++) weeks.push(w);
    return weeks;
  }, [deals]);

  const stageOptions: StageOption[] = ["all", "Mexico 2026", "Leads Mexico 2026"];

  // Stage filter applies everywhere; the week filter only narrows the table —
  // both trend charts need every week to make sense.
  const stageFiltered = deals.filter((d) => selectedStage === "all" || d.stage === selectedStage);

  const filtered = stageFiltered.filter((d) => selectedWeek === "all" || d.weekIndex === selectedWeek);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <TabGroup
          options={stageOptions}
          selected={selectedStage}
          onSelect={setSelectedStage}
          label={(o) => STAGE_LABEL[o]}
        />
        <TabGroup
          options={weekOptions}
          selected={selectedWeek}
          onSelect={setSelectedWeek}
          label={weekLabel}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Aplicaciones = stage <em>Mexico 2026</em>, Leads = stage <em>Leads Mexico 2026</em>.
        Semanas contadas desde el inicio de la opencall (29 jun 2026). &ldquo;Todos&rdquo; /
        &ldquo;Total&rdquo; no filtran.
      </p>
      <FunnelTable deals={filtered} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ApplicationsOverTimeChart deals={stageFiltered} />
        <WeeklyVolumeChart deals={stageFiltered} />
      </div>
      <QualitySummary deals={filtered} />
    </div>
  );
}
