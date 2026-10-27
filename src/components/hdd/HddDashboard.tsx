"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { HddDashboardData } from "@/lib/hdd/types";
import { Comparison, Coverage } from "./Overview";
import { StartupReport } from "./StartupReport";
import { WellbeingScatter } from "./WellbeingScatter";

const ALL = "all";

export function HddDashboard({ data }: { data: HddDashboardData }) {
  const [selected, setSelected] = useState<string>(ALL);
  const startups = [...data.startups].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const current = startups.find((s) => s.startupId === selected) ?? null;
  const allFounders = startups.flatMap((s) => s.founders);
  const scope = current ? [current] : startups;
  const updated = new Date(data.generatedAt);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="hdd-startup" className="text-sm font-medium text-[var(--text-secondary)]">Startup</label>
          <div className="relative inline-block">
            <select
              id="hdd-startup"
              value={current ? current.startupId : ALL}
              onChange={(e) => setSelected(e.target.value)}
              className="appearance-none rounded-full border border-[var(--border)] bg-[var(--surface-1)] py-1.5 pl-3 pr-7 text-sm font-medium text-[var(--text-primary)]"
            >
              <option value={ALL}>Todas</option>
              {startups.map((s) => (
                <option key={s.startupId} value={s.startupId}>{s.name}</option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">▾</span>
          </div>
        </div>
        {!Number.isNaN(updated.getTime()) && (
          <p className="text-xs text-[var(--text-muted)]">
            Actualizado {updated.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      {current && (
        <div className="flex items-center gap-3">
          {current.logoUrl && <img src={current.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />}
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{current.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {current.sector ? `${current.sector} · ` : ""}
              {current.founders.length} {current.founders.length === 1 ? "founder" : "founders"}
            </p>
          </div>
        </div>
      )}

      <Coverage startups={scope} />

      {!current && (
        <>
          <Comparison startups={startups} onSelect={setSelected} />
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90">▶</span>
              Bienestar del grupo: OLBI y BRS
            </summary>
            <div className="mt-4"><WellbeingScatter startups={startups} selectedId={null} /></div>
          </details>
        </>
      )}

      <div className="flex flex-col gap-6">
        {scope.map((s) => (
          <StartupReport key={s.startupId} startup={s} allFounders={allFounders} onOpen={current ? undefined : () => setSelected(s.startupId)} />
        ))}
      </div>
    </div>
  );
}
