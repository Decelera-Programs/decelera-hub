"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import { legalMazeFlags } from "@/lib/hdd/aggregate";
import { LEGAL_MAZE_CONTENT } from "@/lib/hdd/legalMazeContent";
import type { FounderHdd, StartupHdd, WellbeingTake } from "@/lib/hdd/types";
import { FounderPanel, HardSkills, SoftSkills, Wellbeing } from "./FounderCard";
import { LegalMaze } from "./LegalMaze";
import { EVENTS, EVENT_SHORT, fmt, HARD_KEYS, HARD_LABEL, initials, SOFT_KEYS, SOFT_SHORT, TEAM_KEYS, TEAM_LABEL } from "./labels";

const LETTERS = ["A", "B", "C"] as const;

function MiniBar({ label, value, color, title }: { label: string; value: number | null | undefined; color: string; title?: string }) {
  const has = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="flex items-center gap-2 text-xs" title={title}>
      <span className="w-[4.5rem] shrink-0 truncate text-[var(--text-secondary)]">{label}</span>
      <div role="img" aria-label={`${label}: ${has ? fmt(value) : "sin datos"}`} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--column-band)]">
        {has && <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / 10) * 100))}%`, background: color }} />}
      </div>
      <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-[var(--text-primary)]">{has ? fmt(value) : "—"}</span>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{children}</p>;
}

function LegalChips({ founder }: { founder: FounderHdd }) {
  const lm = founder.legalMaze;
  if (!lm || !lm.dilemmas.length) return <p className="text-xs italic text-[var(--text-muted)]">Sin completar</p>;
  const byId = new Map(lm.dilemmas.map((d) => [d.id, d]));
  const flag = legalMazeFlags(lm.dilemmas).d1ChoseA;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {LEGAL_MAZE_CONTENT.map((c) => {
          const ch = byId.get(c.id)?.choice;
          const letter = typeof ch === "number" ? LETTERS[ch] : "—";
          const alert = c.id === "D1" && flag;
          return (
            <span
              key={c.id}
              title={`${c.id} · ${c.theme} (${c.kpiLabel})`}
              className="flex flex-col items-center rounded-md border px-1.5 py-0.5 text-[10px] leading-tight text-[var(--text-muted)]"
              style={{
                borderColor: alert ? "var(--status-critical)" : "var(--border)",
                background: alert ? "color-mix(in srgb, var(--status-critical) 12%, transparent)" : undefined,
              }}
            >
              {c.id}
              <span className="text-sm font-semibold text-[var(--text-primary)]">{letter}</span>
            </span>
          );
        })}
      </div>
      {flag && <p className="text-[11px] text-[var(--status-critical)]">Eligió A en D1 (señal a revisar)</p>}
    </div>
  );
}

function Change({ pre, post, lowerIsBetter }: { pre: number | null; post: number | null; lowerIsBetter: boolean }) {
  if (pre == null || post == null) return null;
  const d = post - pre;
  if (!Number.isFinite(d) || Math.abs(d) < 0.005) return <span className="text-[var(--text-muted)]">=</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span className="font-medium" style={{ color: good ? "var(--status-good)" : "var(--status-critical)" }}>
      {d > 0 ? "▲" : "▼"}<span className="sr-only">{good ? " mejora" : " empeora"}</span>
    </span>
  );
}

const WELLBEING: { key: keyof Omit<WellbeingTake, "completedAt">; label: string; lowerIsBetter: boolean; hint: string }[] = [
  { key: "exhaustion", label: "Exhaustion", lowerIsBetter: true, hint: "OLBI 1-4 · menos es mejor" },
  { key: "disengagement", label: "Disengag.", lowerIsBetter: true, hint: "OLBI 1-4 · menos es mejor" },
  { key: "resilience", label: "Resilience", lowerIsBetter: false, hint: "BRS 1-5 · más es mejor" },
];

function WellbeingCompact({ founder }: { founder: FounderHdd }) {
  const { pre, post } = founder.wellbeing;
  if (!pre && !post) return <p className="text-xs italic text-[var(--text-muted)]">Sin respuestas</p>;
  return (
    <table className="w-full text-xs">
      <thead className="sr-only"><tr><th>Medida</th><th>Pre</th><th>Post</th><th>Cambio</th></tr></thead>
      <tbody>
        {WELLBEING.map((r) => (
          <tr key={r.key} title={r.hint}>
            <th scope="row" className="py-0.5 pr-2 text-left font-normal text-[var(--text-secondary)]">{r.label}</th>
            <td className="py-0.5 text-right tabular-nums text-[var(--text-muted)]">{fmt(pre?.[r.key], 2)}</td>
            <td className="px-1 py-0.5 text-center text-[var(--text-muted)]">→</td>
            <td className="py-0.5 text-right font-semibold tabular-nums text-[var(--text-primary)]">{fmt(post?.[r.key], 2)}</td>
            <td className="w-4 py-0.5 text-right"><Change pre={pre?.[r.key] ?? null} post={post?.[r.key] ?? null} lowerIsBetter={r.lowerIsBetter} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FounderRow({ founder }: { founder: FounderHdd }) {
  const [broken, setBroken] = useState(false);
  const evals = founder.evaluations.length;
  const hasSoft = SOFT_KEYS.some((k) => (founder.soft[k]?.n ?? 0) > 0);
  return (
    <article className="flex flex-col gap-3 py-4 first:pt-0" aria-label={`Founder ${founder.fullName}`}>
      <header className="flex items-center gap-3">
        {founder.photoUrl && !broken ? (
          <img src={founder.photoUrl} alt="" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--tile-1-bg)", color: "var(--tile-1-ink)" }}>
            {initials(founder.fullName)}
          </span>
        )}
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{founder.fullName}</h4>
          <p className="text-xs text-[var(--text-muted)]">{evals} {evals === 1 ? "evaluación" : "evaluaciones"}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-12">
        <section className="md:col-span-5" aria-label="Soft skills">
          <Label>Soft skills · 1-10</Label>
          {hasSoft ? (
            <div className="flex flex-col gap-1">
              {SOFT_KEYS.map((k) => {
                const s = founder.soft[k];
                const has = !!s && s.n > 0;
                const title = has ? `n=${s.n} · ${EVENTS.map((e) => `${EVENT_SHORT[e]} ${s.byEvent[e] ? fmt(s.byEvent[e]!.avg) : "—"}`).join(" · ")}` : "Sin evaluaciones";
                return <MiniBar key={k} label={SOFT_SHORT[k]} value={has ? s.avg : null} color="var(--series-1)" title={title} />;
              })}
            </div>
          ) : (
            <p className="text-xs italic text-[var(--text-muted)]">Sin evaluaciones aún</p>
          )}
        </section>

        <div className="flex flex-col gap-4 md:col-span-3">
          <section aria-label="Hard skills">
            <Label>Hard skills · 1-10</Label>
            {HARD_KEYS.some((k) => typeof founder.hard[k] === "number") ? (
              <div className="flex flex-col gap-1">
                {HARD_KEYS.map((k) => <MiniBar key={k} label={HARD_LABEL[k]} value={founder.hard[k]} color="var(--series-2)" />)}
              </div>
            ) : (
              <p className="text-xs italic text-[var(--text-muted)]">Sin valoraciones</p>
            )}
          </section>
          <section aria-label="Legal Maze">
            <Label>Legal Maze</Label>
            <LegalChips founder={founder} />
          </section>
        </div>

        <section className="md:col-span-4" aria-label="Bienestar">
          <Label>Bienestar · pre → post</Label>
          <WellbeingCompact founder={founder} />
        </section>
      </div>

      <details className="group text-xs">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-[var(--text-secondary)] [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="text-[10px] transition-transform group-open:rotate-90">▶</span> Ver detalle completo
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FounderPanel founder={founder} hint="Soft skills"><SoftSkills founder={founder} /></FounderPanel>
          <FounderPanel founder={founder} hint="Legal Maze"><LegalMaze founder={founder} /></FounderPanel>
          <FounderPanel founder={founder} hint="Hard skills"><HardSkills founder={founder} /></FounderPanel>
          <FounderPanel founder={founder} hint="Bienestar (OLBI y BRS)"><Wellbeing founder={founder} /></FounderPanel>
        </div>
      </details>
    </article>
  );
}

function TeamStrip({ startup }: { startup: StartupHdd }) {
  if (startup.founders.length < 2) {
    return <p className="text-xs italic text-[var(--text-muted)]">Un solo founder: no hay KPIs de equipo.</p>;
  }
  const has = TEAM_KEYS.some((k) => (startup.team[k]?.n ?? 0) > 0);
  if (!has) return <p className="text-xs italic text-[var(--text-muted)]">Sin evaluaciones de equipo aún.</p>;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
      {TEAM_KEYS.map((k) => {
        const s = startup.team[k];
        const has = !!s && s.n > 0;
        const title = has ? `n=${s.n} · ${EVENTS.map((e) => `${EVENT_SHORT[e]} ${s.byEvent[e] ? fmt(s.byEvent[e]!.avg) : "—"}`).join(" · ")}` : "Sin evaluaciones";
        return <MiniBar key={k} label={TEAM_LABEL[k]} value={has ? s.avg : null} color="var(--series-1)" title={title} />;
      })}
    </div>
  );
}

/** Ficha de una startup en formato informe: cabecera, KPIs de equipo y una fila compacta por founder. */
export function StartupReport({ startup, onOpen }: { startup: StartupHdd; onOpen?: () => void }) {
  const c = startup.coverage;
  const chips = [
    `Soft ${c.withSoft}/${c.founders}`, `Legal Maze ${c.withLegalMaze}/${c.founders}`,
    `Bienestar pre ${c.withWellbeingPre}/${c.founders}`, `post ${c.withWellbeingPost}/${c.founders}`,
  ];
  return (
    <section className="card flex flex-col gap-5 p-6 shadow-sm" aria-label={`Informe de ${startup.name}`}>
      <header className="flex flex-wrap items-center gap-3">
        {startup.logoUrl && <img src={startup.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />}
        <div className="mr-auto">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {onOpen ? <button type="button" onClick={onOpen} className="hover:underline">{startup.name}</button> : startup.name}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {startup.sector ? `${startup.sector} · ` : ""}{startup.founders.length} {startup.founders.length === 1 ? "founder" : "founders"}
          </p>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Cobertura de datos">
          {chips.map((t) => (
            <li key={t} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">{t}</li>
          ))}
        </ul>
      </header>

      <div className="rounded-lg bg-[var(--column-band)] p-4">
        <Label>Equipo · 1-10</Label>
        <TeamStrip startup={startup} />
      </div>

      <div className="flex flex-col divide-y divide-[var(--border)]">
        {startup.founders.length === 0
          ? <p className="text-sm italic text-[var(--text-muted)]">Sin founders en HDD</p>
          : startup.founders.map((f) => <FounderRow key={f.personId} founder={f} />)}
      </div>
    </section>
  );
}
