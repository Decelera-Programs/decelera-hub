"use client";

import { useMemo, useState } from "react";
import { FunnelTable } from "./FunnelTable";
import { computeWeek } from "@/lib/transform";
import type { Deal } from "@/lib/types";

type WeekOption = "all" | -1 | number;

function weekLabel(option: WeekOption) {
  if (option === "all") return "Total";
  if (option === -1) return "Pre-opencall";
  return `Semana ${option}`;
}

export function FunnelDashboard({ deals }: { deals: Deal[] }) {
  const [selected, setSelected] = useState<WeekOption>("all");

  const options = useMemo<WeekOption[]>(() => {
    const currentWeek = Math.max(0, computeWeek(new Date()).weekIndex ?? 0);
    const dataMaxWeek = Math.max(0, ...deals.map((d) => d.weekIndex ?? 0));
    const lastWeek = Math.max(currentWeek, dataMaxWeek, 1);
    const weeks: WeekOption[] = ["all", -1];
    for (let w = 1; w <= lastWeek; w++) weeks.push(w);
    return weeks;
  }, [deals]);

  const filtered = selected === "all" ? deals : deals.filter((d) => d.weekIndex === selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-1">
          {options.map((option) => {
            const active = option === selected;
            return (
              <button
                key={String(option)}
                onClick={() => setSelected(option)}
                className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: "var(--series-1)", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {weekLabel(option)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Semanas contadas desde el inicio de la opencall (29 jun 2026). &ldquo;Total&rdquo; no
          filtra por fecha.
        </p>
      </div>
      <FunnelTable deals={filtered} />
    </div>
  );
}
