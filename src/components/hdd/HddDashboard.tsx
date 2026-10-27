"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { HddDashboardData } from "@/lib/hdd/types";
import { Coverage } from "./Overview";
import { StartupReport } from "./StartupReport";

export function HddDashboard({ data }: { data: HddDashboardData }) {
  const startups = [...data.startups].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const [selected, setSelected] = useState<string | null>(null);
  const current = startups.find((s) => s.startupId === selected) ?? startups[0] ?? null;
  const updated = new Date(data.generatedAt);

  if (!current) return <p className="text-sm text-[var(--text-muted)]">Sin startups.</p>;

  return (
    <div className="flex flex-col gap-4">
      {!Number.isNaN(updated.getTime()) && (
        <p className="text-xs text-[var(--text-muted)]">
          Actualizado {updated.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav aria-label="Startups" className="lg:sticky lg:top-4 lg:w-52 lg:shrink-0">
          <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {startups.map((s) => {
              const active = s.startupId === current.startupId;
              return (
                <li key={s.startupId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(s.startupId)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--brand-sun)] bg-[var(--column-band)] font-semibold text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--column-band)]"
                    }`}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded object-contain" />
                    ) : (
                      <span aria-hidden className="h-5 w-5 shrink-0 rounded bg-[var(--border)]" />
                    )}
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto shrink-0 text-[10px] font-normal tabular-nums text-[var(--text-muted)]">{s.founders.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Coverage startups={[current]} />
          <StartupReport key={current.startupId} startup={current} allStartups={startups} />
        </div>
      </div>
    </div>
  );
}
