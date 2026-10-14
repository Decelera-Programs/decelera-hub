"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { StatTile } from "@/components/SummaryKpis";
import { Empty } from "@/components/hdd/Empty";
import { FounderPanel, Wellbeing } from "@/components/hdd/FounderCard";
import { fmt, mean, pct } from "@/components/hdd/labels";
import { WellbeingScatter } from "@/components/hdd/WellbeingScatter";
import type { FounderHdd, StartupHdd, WellbeingTake } from "@/lib/hdd/types";
import { SOFT_KEYS, TEAM_KEYS } from "@/lib/hdd-menorca/aggregate";
import {
  MENORCA_SCALE_MAX, type MenorcaDashboardData, type MenorcaFounder, type MenorcaSoftKey,
  type MenorcaSource, type MenorcaStartup, type MenorcaStat, type MenorcaTeamKey,
} from "@/lib/hdd-menorca/types";

const ALL = "all";

const SOFT_LABEL: Record<MenorcaSoftKey, string> = {
  leadership: "Leadership", cool_head: "Cool Head", resilience: "Resilience", coachability: "Coachability",
  integrity: "Integrity", self_confidence: "Self Confidence", unconventional_thinking: "Unconventional Thinking",
  doer: "Doer", purpose: "Purpose", ambition_obsession: "Ambition & Obsession",
};
const SOFT_SHORT: Record<MenorcaSoftKey, string> = {
  leadership: "Leadership", cool_head: "Cool Head", resilience: "Resilience", coachability: "Coach.",
  integrity: "Integrity", self_confidence: "Self Conf.", unconventional_thinking: "Unconv.",
  doer: "Doer", purpose: "Purpose", ambition_obsession: "Ambition",
};
const TEAM_LABEL: Record<MenorcaTeamKey, string> = {
  trust_conflict_resolution: "Trust & Conflict Resolution", clear_operational_roles: "Clear Operational Roles",
  complementary_personality: "Complementary Personality", vision_alignment: "Vision Alignment",
};
const SOURCES: MenorcaSource[] = ["paellas", "games", "ficha"];
const SOURCE_LABEL: Record<MenorcaSource, string> = { paellas: "Paellas", games: "Games", ficha: "Ficha HDD" };
const LEGAL_METRIC_LABEL: Record<string, string> = {
  purpose: "Purpose", ambition: "Ambition", cool_head: "Cool Head", integrity: "Integrity", confidence: "Confidence",
  trust_conflict: "Trust & Conflict",
};
const legalLabel = (k: string) => LEGAL_METRIC_LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Adaptadores para reutilizar los componentes de bienestar de México (solo leen `wellbeing`, `fullName` y la cobertura).
const asFounderHdd = (f: MenorcaFounder): FounderHdd => ({
  personId: f.personId, fullName: f.fullName, photoUrl: null, startupId: f.startupId,
  soft: {}, evaluations: [], hard: {}, legalMaze: null, wellbeing: f.wellbeing,
});
const asStartupHdd = (s: MenorcaStartup): StartupHdd => ({
  startupId: s.startupId, name: s.name, logoUrl: null, sector: null, founders: s.founders.map(asFounderHdd),
  team: {}, softAvg: {},
  coverage: { founders: s.coverage.founders, withSoft: s.coverage.withSoft, withLegalMaze: s.coverage.withLegalMaze, withWellbeingPre: s.coverage.withWellbeingPre, withWellbeingPost: s.coverage.withWellbeingPost },
});

function Block({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`hddm-s${n}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5 border-b border-[var(--border)] pb-2">
        <h2 id={`hddm-s${n}`} className="text-lg font-semibold text-[var(--text-primary)]">
          <span className="mr-2 text-[var(--text-muted)]">{n}</span>{title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Bar({ value, color, label, max = MENORCA_SCALE_MAX }: { value: number | null | undefined; color: string; label: string; max?: number }) {
  const has = typeof value === "number" && Number.isFinite(value);
  return (
    <div role="img" aria-label={`${label}: ${has ? fmt(value, 2) : "sin datos"}`} className="h-2 overflow-hidden rounded-full bg-[var(--column-band)]">
      {has && <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />}
    </div>
  );
}

function sourcesText(s: MenorcaStat): string {
  return SOURCES.filter((k) => s.bySource[k]).map((k) => `${SOURCE_LABEL[k]} ${fmt(s.bySource[k]!.avg, 2)} (n=${s.bySource[k]!.n})`).join(" · ");
}

/** Escala de la que sale cada nota. */
const ScaleNote = () => `escala 1 a ${MENORCA_SCALE_MAX}`;

/** Una tarjeta por founder, agrupadas por startup (con cabecera de startup solo si hay varias en pantalla). */
function ByFounder({ startups, hint, render }: { startups: MenorcaStartup[]; hint?: (f: MenorcaFounder) => string | undefined; render: (f: MenorcaFounder) => ReactNode }) {
  const withFounders = startups.filter((s) => s.founders.length > 0);
  if (withFounders.length === 0) return <Empty>Sin founders en HDD</Empty>;
  return (
    <div className="flex flex-col gap-6">
      {withFounders.map((s) => (
        <div key={s.startupId} className="flex flex-col gap-3">
          {startups.length > 1 && <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{s.name}</h3>}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {s.founders.map((f) => (
              <FounderPanel key={f.personId} founder={asFounderHdd(f)} hint={hint?.(f)}>{render(f)}</FounderPanel>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Coverage({ startups }: { startups: MenorcaStartup[] }) {
  const sum = (f: (s: MenorcaStartup) => number) => startups.reduce((a, s) => a + f(s), 0);
  const total = sum((s) => s.coverage.founders);
  const soft = sum((s) => s.coverage.withSoft);
  const lm = sum((s) => s.coverage.withLegalMaze);
  const pre = sum((s) => s.coverage.withWellbeingPre);
  const post = sum((s) => s.coverage.withWellbeingPost);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Founders con soft skills" value={`${soft} / ${total}`} caption="Con al menos una evaluación" accent="var(--series-1)" />
      <StatTile label="Legal Maze" value={pct(lm, total)} caption={`${lm} de ${total} founders`} accent="var(--series-2)" />
      <StatTile label="OLBI / BRS pre" value={pct(pre, total)} caption={`${pre} de ${total} founders`} accent="var(--series-3)" />
      <StatTile label="OLBI / BRS post" value={pct(post, total)} caption={`${post} de ${total} founders`} accent="var(--status-warning)" />
    </div>
  );
}

function SoftComparison({ startups, onSelect }: { startups: MenorcaStartup[]; onSelect: (id: string) => void }) {
  const keys = SOFT_KEYS.filter((k) => startups.some((s) => s.softAvg[k] != null));
  return (
    <ChartCard title="Comparativa de startups" subtitle={`Media de soft skills de sus founders (${ScaleNote()}). Pulsa una startup para ver el detalle.`}>
      {keys.length === 0 ? (
        <Empty>Sin evaluaciones aún</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Media de soft skills por startup</caption>
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th scope="col" className="sticky left-0 bg-[var(--surface-1)] py-2 pr-3 font-medium">Startup</th>
                <th scope="col" className="px-2 py-2 text-center font-medium">Cobertura</th>
                {keys.map((k) => <th key={k} scope="col" className="px-1 py-2 text-center font-medium" title={SOFT_LABEL[k]}>{SOFT_SHORT[k]}</th>)}
                <th scope="col" className="px-2 py-2 text-center font-medium">Media</th>
              </tr>
            </thead>
            <tbody>
              {startups.map((s) => (
                <tr key={s.startupId}>
                  <th scope="row" className="sticky left-0 border-t border-[var(--border)] bg-[var(--surface-1)] py-1.5 pr-3 text-left font-normal">
                    <button type="button" onClick={() => onSelect(s.startupId)} className="text-left font-medium text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:underline">{s.name}</button>
                  </th>
                  <td className="border-t border-[var(--border)] px-2 py-1.5 text-center text-[var(--text-secondary)]">{s.coverage.withSoft}/{s.coverage.founders}</td>
                  {keys.map((k) => {
                    const v = s.softAvg[k];
                    const has = typeof v === "number";
                    return (
                      <td key={k} className="border-t border-[var(--border)] px-1 py-1.5 text-center" style={has ? { background: `color-mix(in srgb, var(--series-1) ${Math.round((v / MENORCA_SCALE_MAX) * 40)}%, transparent)` } : undefined}>
                        <span className={has ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{fmt(v, 2)}</span>
                      </td>
                    );
                  })}
                  <td className="border-t border-[var(--border)] px-2 py-1.5 text-center font-semibold text-[var(--text-primary)]">{fmt(mean(keys.map((k) => s.softAvg[k])), 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function SoftSkills({ founder }: { founder: MenorcaFounder }) {
  const [mode, setMode] = useState<"radar" | "bars">("radar");
  const keys = SOFT_KEYS.filter((k) => founder.soft[k]);
  if (keys.length === 0) return <Empty>Sin evaluaciones aún</Empty>;
  const data = keys.map((k) => ({ skill: SOFT_SHORT[k], full: SOFT_LABEL[k], value: founder.soft[k]!.avg, n: founder.soft[k]!.n }));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)]">{founder.samples} {founder.samples === 1 ? "evaluación" : "evaluaciones"} · {ScaleNote()}</span>
        {keys.length >= 3 && (
          <div role="group" aria-label="Vista de soft skills" className="flex gap-1 rounded-full border border-[var(--border)] p-0.5">
            {(["radar", "bars"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="rounded-full px-2.5 py-1 text-xs font-medium" style={mode === m ? { background: "var(--series-1)", color: "#fff" } : { color: "var(--text-secondary)" }}>
                {m === "radar" ? "Radar" : "Barras"}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === "radar" && keys.length >= 3 ? (
        <div className="h-72 w-full" role="img" aria-label={`Radar de soft skills de ${founder.fullName}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="var(--gridline)" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, MENORCA_SCALE_MAX]} tickCount={5} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="card px-3 py-2 text-sm shadow-md">
                      <p className="font-medium text-[var(--text-primary)]">{p.full}</p>
                      <p className="text-[var(--text-secondary)]">{fmt(p.value, 2)} · n={p.n}</p>
                    </div>
                  );
                }}
              />
              <Radar dataKey="value" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {keys.map((k) => {
            const s = founder.soft[k]!;
            return (
              <li key={k} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-[var(--text-primary)]">{SOFT_LABEL[k]}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{fmt(s.avg, 2)}<span className="ml-1 text-xs font-normal text-[var(--text-muted)]">n={s.n}</span></span>
                </div>
                <Bar value={s.avg} color="var(--series-1)" label={SOFT_LABEL[k]} />
                <span className="text-xs text-[var(--text-muted)]">{sourcesText(s)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {mode === "radar" && keys.length >= 3 && (
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {keys.map((k) => (
            <li key={k} className="flex justify-between gap-2 text-[var(--text-secondary)]" title={sourcesText(founder.soft[k]!)}>
              <span>{SOFT_LABEL[k]}</span>
              <span className="font-medium text-[var(--text-primary)]">{fmt(founder.soft[k]!.avg, 2)} (n={founder.soft[k]!.n})</span>
            </li>
          ))}
        </ul>
      )}
      {founder.evaluators.length > 0 && <p className="text-xs text-[var(--text-muted)]">Evaluadores: {founder.evaluators.join(", ")}</p>}
    </div>
  );
}

function TeamCard({ startup }: { startup: MenorcaStartup }) {
  const rows = TEAM_KEYS.filter((k) => startup.team[k]);
  const { pre, post } = startup.wellbeing;
  const wRows: { label: string; key: keyof Omit<WellbeingTake, "completedAt">; scale: string }[] = [
    { label: "Exhaustion", key: "exhaustion", scale: "OLBI 1-4" },
    { label: "Disengagement", key: "disengagement", scale: "OLBI 1-4" },
    { label: "Resilience", key: "resilience", scale: "BRS 1-5" },
  ];
  return (
    <ChartCard title={startup.name} subtitle={`${startup.coverage.founders} ${startup.coverage.founders === 1 ? "founder" : "founders"}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--text-muted)]">KPIs de equipo ({ScaleNote()})</p>
          {rows.length === 0 ? (
            <Empty>Sin evaluaciones de equipo aún</Empty>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {rows.map((k) => {
                const s = startup.team[k]!;
                return (
                  <li key={k} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-[var(--text-primary)]">{TEAM_LABEL[k]}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{fmt(s.avg, 2)}<span className="ml-1 text-xs font-normal text-[var(--text-muted)]">n={s.n}</span></span>
                    </div>
                    <Bar value={s.avg} color="var(--series-1)" label={TEAM_LABEL[k]} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {startup.legalAvg.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">Legal Maze: media del equipo ({ScaleNote()})</p>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              {startup.legalAvg.map((m) => (
                <li key={m.key} className="flex justify-between gap-2 text-[var(--text-secondary)]"><span>{legalLabel(m.key)}</span><span className="font-medium text-[var(--text-primary)]">{fmt(m.value, 2)}</span></li>
              ))}
            </ul>
          </div>
        )}
        {(pre || post) && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-[var(--text-muted)]">Bienestar: media del equipo (pre n={startup.wellbeing.nPre} · post n={startup.wellbeing.nPost})</p>
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[var(--text-muted)]"><th scope="col" className="py-1 font-medium">Medida</th><th scope="col" className="py-1 text-right font-medium">Pre</th><th scope="col" className="py-1 text-right font-medium">Post</th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {wRows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="py-1 text-left font-normal text-[var(--text-primary)]">{r.label}<span className="ml-1 text-[var(--text-muted)]">{r.scale}</span></th>
                    <td className="py-1 text-right text-[var(--text-primary)]">{fmt(pre?.[r.key], 2)}</td>
                    <td className="py-1 text-right text-[var(--text-primary)]">{fmt(post?.[r.key], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function LegalMaze({ founder }: { founder: MenorcaFounder }) {
  const lm = founder.legalMaze;
  if (!lm) return <Empty>Legal Maze sin completar</Empty>;
  return (
    <div className="flex flex-col gap-4">
      {lm.answers.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
          {lm.answers.map((a, i) => (
            <li key={a.key} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-[var(--text-secondary)]"><span className="mr-2 text-[var(--text-muted)]">Q{i + 1}</span>{a.label}</span>
              <span className="font-semibold text-[var(--text-primary)]">{a.choice ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
      {lm.metrics.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lm.metrics.map((m) => (
            <li key={m.key} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-primary)]">{legalLabel(m.key)}</span><span className="font-semibold text-[var(--text-primary)]">{fmt(m.value, 2)}</span></div>
              <Bar value={m.value} color="var(--series-3)" label={legalLabel(m.key)} />
            </li>
          ))}
          <li className="text-xs text-[var(--text-muted)]">Métricas del form · {ScaleNote()}</li>
        </ul>
      )}
    </div>
  );
}

export function MenorcaDashboard({ data }: { data: MenorcaDashboardData }) {
  const [selected, setSelected] = useState<string>(ALL);
  const startups = useMemo(() => [...data.startups].sort((a, b) => a.name.localeCompare(b.name, "es")), [data.startups]);
  const current = startups.find((s) => s.startupId === selected) ?? null;
  const scope = current ? [current] : startups;
  const hddStartups = useMemo(() => startups.map(asStartupHdd), [startups]);
  const updated = new Date(data.generatedAt);
  const evals = (f: MenorcaFounder) => `${f.samples} ${f.samples === 1 ? "evaluación" : "evaluaciones"}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="hddm-startup" className="text-sm font-medium text-[var(--text-secondary)]">Startup</label>
          <div className="relative inline-block">
            <select id="hddm-startup" value={current ? current.startupId : ALL} onChange={(e) => setSelected(e.target.value)} className="appearance-none rounded-full border border-[var(--border)] bg-[var(--surface-1)] py-1.5 pl-3 pr-7 text-sm font-medium text-[var(--text-primary)]">
              <option value={ALL}>Todas</option>
              {startups.map((s) => <option key={s.startupId} value={s.startupId}>{s.name}</option>)}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">▾</span>
          </div>
        </div>
        {!Number.isNaN(updated.getTime()) && <p className="text-xs text-[var(--text-muted)]">Actualizado {updated.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </div>

      {current && (
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{current.name}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{current.founders.length} {current.founders.length === 1 ? "founder" : "founders"}</p>
        </div>
      )}

      <Coverage startups={scope} />

      <Block n={1} title="Soft skills" hint="Soft skills individuales de cada founder: Paellas Contest, Decelera Games y ficha HDD. Cada evaluador cuenta una vez.">
        {!current && <SoftComparison startups={startups} onSelect={setSelected} />}
        <ByFounder startups={scope} hint={evals} render={(f) => <SoftSkills founder={f} />} />
      </Block>

      <Block n={2} title="Equipo" hint="Por startup: KPIs de equipo, media del Legal Maze y media de bienestar de sus founders.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {scope.map((s) => <TeamCard key={s.startupId} startup={s} />)}
        </div>
      </Block>

      <Block n={3} title="Legal Maze" hint="Elección en cada pregunta y métricas que calcula el form, por founder.">
        <ByFounder startups={scope} render={(f) => <LegalMaze founder={f} />} />
      </Block>

      <Block n={4} title="Bienestar: OLBI y BRS" hint="Exhaustion y Disengagement from Work (OLBI) y Resilience (BRS), antes y después del programa.">
        <WellbeingScatter startups={hddStartups} selectedId={current ? current.startupId : null} />
        <ByFounder startups={scope} render={(f) => <Wellbeing founder={asFounderHdd(f)} />} />
      </Block>
    </div>
  );
}
