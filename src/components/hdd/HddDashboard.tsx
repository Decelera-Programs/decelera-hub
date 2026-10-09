"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import type { FounderHdd, HddDashboardData, StartupHdd } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import { FounderPanel, HardSkills, SoftSkills, Wellbeing } from "./FounderCard";
import { LegalMaze } from "./LegalMaze";
import { Comparison, Coverage } from "./Overview";
import { TeamKpis } from "./TeamKpis";
import { WellbeingScatter } from "./WellbeingScatter";

const ALL = "all";

function Block({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`hdd-s${n}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5 border-b border-[var(--border)] pb-2">
        <h2 id={`hdd-s${n}`} className="text-lg font-semibold text-[var(--text-primary)]">
          <span className="mr-2 text-[var(--text-muted)]">{n}</span>{title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** Una tarjeta por founder, agrupadas por startup (con cabecera de startup solo si hay varias en pantalla). */
function ByFounder({
  startups, hint, render,
}: {
  startups: StartupHdd[];
  hint?: (f: FounderHdd) => string | undefined;
  render: (f: FounderHdd) => ReactNode;
}) {
  const withFounders = startups.filter((s) => s.founders.length > 0);
  if (withFounders.length === 0) return <Empty>Sin founders en HDD</Empty>;
  return (
    <div className="flex flex-col gap-6">
      {withFounders.map((s) => (
        <div key={s.startupId} className="flex flex-col gap-3">
          {startups.length > 1 && (
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
              {s.logoUrl && <img src={s.logoUrl} alt="" className="h-5 w-5 rounded object-contain" />}
              {s.name}
            </h3>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {s.founders.map((f) => (
              <FounderPanel key={f.personId} founder={f} hint={hint?.(f)}>{render(f)}</FounderPanel>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HddDashboard({ data }: { data: HddDashboardData }) {
  const [selected, setSelected] = useState<string>(ALL);
  const startups = [...data.startups].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const current = startups.find((s) => s.startupId === selected) ?? null;
  const scope = current ? [current] : startups;
  const updated = new Date(data.generatedAt);
  const evals = (f: FounderHdd) => `${f.evaluations.length} ${f.evaluations.length === 1 ? "evaluación" : "evaluaciones"}`;

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

      <Block n={1} title="Hard skills" hint="Niche, Tech y Go to Market de cada founder, según el Inside Team (escala 1 a 10).">
        <ByFounder startups={scope} render={(f) => <HardSkills founder={f} />} />
      </Block>

      <Block n={2} title="KPIs de equipo" hint="Trust & Conflict Resolution, roles, personalidades y visión: valoración del equipo en su conjunto.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {scope.map((s) => (
            <div key={s.startupId} className="flex flex-col gap-2">
              {scope.length > 1 && <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{s.name}</h3>}
              <TeamKpis startup={s} />
            </div>
          ))}
        </div>
      </Block>

      <Block n={3} title="Soft skills" hint="Las 9 soft skills individuales de cada founder, en araña (o barras con el desglose por dinámica).">
        {!current && <Comparison startups={startups} onSelect={setSelected} />}
        <ByFounder startups={scope} hint={evals} render={(f) => <SoftSkills founder={f} />} />
      </Block>

      <Block n={4} title="Conclusiones del Legal Maze" hint="Patrón de votos de cada founder en los 5 dilemas, con su lectura y las señales a revisar.">
        <ByFounder startups={scope} render={(f) => <LegalMaze founder={f} />} />
      </Block>

      <Block n={5} title="Bienestar: OLBI y BRS" hint="Exhaustion y Disengagement from Work (OLBI) y Resilience (BRS), antes y después del programa.">
        <WellbeingScatter startups={startups} selectedId={current ? current.startupId : null} />
        <ByFounder startups={scope} render={(f) => <Wellbeing founder={f} />} />
      </Block>
    </div>
  );
}
