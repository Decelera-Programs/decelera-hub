"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { legalMazeFlags } from "@/lib/hdd/aggregate";
import { LEGAL_MAZE_CONTENT } from "@/lib/hdd/legalMazeContent";
import type { FounderHdd, SoftKpiKey, StartupHdd, WellbeingTake } from "@/lib/hdd/types";
import { RadarLegend, type SoftPeer } from "./FounderCard";
import { buildProfile } from "./profile";
import { WellbeingScatter } from "./WellbeingScatter";
import { EVENTS, EVENT_SHORT, fmt, HARD_KEYS, HARD_LABEL, initials, SOFT_KEYS, SOFT_LABEL, SOFT_SHORT, TEAM_KEYS, TEAM_LABEL } from "./labels";

function MiniBar({ label, value, color, title, stacked = false }: { label: string; value: number | null | undefined; color: string; title?: string; stacked?: boolean }) {
  const has = typeof value === "number" && Number.isFinite(value);
  const bar = (
    <div role="img" aria-label={`${label}: ${has ? fmt(value) : "sin datos"}`} className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${stacked ? "bg-[var(--surface-1)]" : "bg-[var(--column-band)]"}`}>
      {has && <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / 10) * 100))}%`, background: color }} />}
    </div>
  );
  const val = <span className="shrink-0 text-right font-semibold tabular-nums text-[var(--text-primary)]">{has ? fmt(value) : "—"}</span>;
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 text-xs" title={title}>
        <span className="flex items-baseline justify-between gap-2 text-[var(--text-secondary)]"><span>{label}</span>{val}</span>
        {bar}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs" title={title}>
      <span className="w-[4.5rem] shrink-0 truncate text-[var(--text-secondary)]">{label}</span>
      {bar}
      <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-[var(--text-primary)]">{has ? fmt(value) : "—"}</span>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{children}</p>;
}

/** Legal Maze en horizontal: una columna por dilema con qué mide, la opción elegida, su lectura breve y el campo abierto. */
function LegalCompact({ founder }: { founder: FounderHdd }) {
  const lm = founder.legalMaze;
  if (!lm || !lm.dilemmas.length) return <p className="text-xs italic text-[var(--text-muted)]">Sin completar</p>;
  const byId = new Map(lm.dilemmas.map((d) => [d.id, d]));
  const flag = legalMazeFlags(lm.dilemmas).d1ChoseA;
  return (
    <ul className="grid grid-cols-1 gap-2 text-[11px] leading-snug sm:grid-cols-2 xl:grid-cols-5">
      {LEGAL_MAZE_CONTENT.map((c) => {
        const d = byId.get(c.id);
        const opt = typeof d?.choice === "number" ? c.options[d.choice] : null;
        const alert = c.id === "D1" && flag;
        return (
          <li
            key={c.id}
            className="flex flex-col gap-1 rounded-lg border p-2.5"
            style={{ borderColor: alert ? "var(--status-critical)" : "var(--border)", background: alert ? "color-mix(in srgb, var(--status-critical) 8%, transparent)" : undefined }}
          >
            <span className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--series-1)] text-[10px]" style={alert ? { borderColor: "var(--status-critical)" } : undefined}>{opt ? opt.letter : "—"}</span>
              {c.id} · {c.theme}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Mide {c.kpiLabel}</span>
            {opt ? (
              <>
                <span className="text-[var(--text-primary)]">{opt.short}</span>
                <span className="text-[var(--text-secondary)]">{opt.gist}</span>
                {alert && <b className="text-[var(--status-critical)]">Señal a revisar: la casilla que más pesa según el doc.</b>}
              </>
            ) : (
              <span className="italic text-[var(--text-muted)]">{d ? "Sin opción elegida" : "Sin respuesta"}</span>
            )}
            {d?.answer && <span className="line-clamp-2 italic text-[var(--text-muted)]" title={d.answer}>“{d.answer}”</span>}
          </li>
        );
      })}
    </ul>
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

type Peer = SoftPeer;

/** Media de cada soft skill entre el resto de founders (cada founder pesa lo mismo); excluye al propio. */
function peerOf(all: FounderHdd[], selfId: string): Peer | null {
  const others = all.filter((f) => f.personId !== selfId);
  const avg: Partial<Record<SoftKpiKey, number>> = {};
  let count = 0;
  for (const f of others) if (SOFT_KEYS.some((k) => (f.soft[k]?.n ?? 0) > 0)) count++;
  for (const k of SOFT_KEYS) {
    const v = others.map((f) => (f.soft[k]?.n ? f.soft[k]!.avg : null)).filter((x): x is number => x != null);
    if (v.length) avg[k] = v.reduce((a, b) => a + b, 0) / v.length;
  }
  return count ? { avg, count } : null;
}

/** KPI que mide cada dilema del Legal Maze → soft skill equivalente (Confianza = Self Confidence). */
const LM_TO_SOFT: Record<string, SoftKpiKey | undefined> = {
  Integridad: "integrity", "Ambición": "ambition_purpose", Confianza: "self_confidence", "Pensamiento no convencional": "unconventional_thinking",
};

/** Letras elegidas en los dilemas del Legal Maze que miden esta soft skill. */
function LegalChips({ founder, skill }: { founder: FounderHdd; skill: SoftKpiKey }) {
  const lm = founder.legalMaze;
  if (!lm) return null;
  const flag = legalMazeFlags(lm.dilemmas).d1ChoseA;
  const byId = new Map(lm.dilemmas.map((d) => [d.id, d]));
  return (
    <>
      {LEGAL_MAZE_CONTENT.filter((c) => LM_TO_SOFT[c.kpiLabel] === skill).map((c) => {
        const d = byId.get(c.id);
        const opt = typeof d?.choice === "number" ? c.options[d.choice] : null;
        if (!opt) return null;
        const alert = c.id === "D1" && flag;
        return (
          <span
            key={c.id}
            title={`Legal Maze ${c.id} · ${c.theme}: ${opt.gist}`}
            className="rounded border px-1 text-[10px] leading-4 text-[var(--text-primary)]"
            style={{ borderColor: alert ? "var(--status-critical)" : "var(--series-1)", background: alert ? "color-mix(in srgb, var(--status-critical) 12%, transparent)" : undefined }}
          >
            {c.id} {opt.letter}
          </span>
        );
      })}
    </>
  );
}

function SoftRadar({ founder, peer }: { founder: FounderHdd; peer: Peer | null }) {
  const data = SOFT_KEYS.map((k) => ({
    skill: SOFT_SHORT[k], full: SOFT_LABEL[k], value: founder.soft[k]?.avg ?? 0, peer: peer?.avg[k] ?? null, n: founder.soft[k]?.n ?? 0,
    byEvent: EVENTS.map((e) => `${EVENT_SHORT[e]} ${founder.soft[k]?.byEvent[e] ? fmt(founder.soft[k]!.byEvent[e]!.avg) : "—"}`).join(" · "),
  }));
  return (
    <div className="flex flex-col gap-1">
      <div className="h-56 w-full" role="img" aria-label={`Radar de soft skills de ${founder.fullName}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="var(--gridline)" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={3} tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div className="card px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-[var(--text-primary)]">{p.full}</p>
                    <p className="text-[var(--text-secondary)]">{p.n ? `${fmt(p.value)} · n=${p.n}` : "Sin evaluaciones"}{p.peer != null && ` · media resto ${fmt(p.peer)}`}</p>
                    {p.n > 0 && <p className="text-[var(--text-muted)]">{p.byEvent}</p>}
                  </div>
                );
              }}
            />
            {peer && <Radar dataKey="peer" stroke="var(--series-3)" strokeWidth={1.5} strokeOpacity={0.7} fill="var(--brand-sun)" fillOpacity={0.14} />}
            <Radar dataKey="value" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <RadarLegend peer={peer} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
        {SOFT_KEYS.map((k) => {
          const sk = founder.soft[k];
          return (
            <li key={k} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className="truncate">{SOFT_SHORT[k]}</span>
              <LegalChips founder={founder} skill={k} />
              <span className="ml-auto font-semibold tabular-nums text-[var(--text-primary)]">{sk?.n ? fmt(sk.avg) : "—"}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-[var(--text-muted)]">Las etiquetas D1 A, D2 B… son la opción elegida en el Legal Maze para esa skill (sin puntuación).</p>
    </div>
  );
}

const TONE_COLOR = { good: "var(--status-good)", watch: "var(--status-critical)", neutral: "var(--text-muted)" } as const;

/** Síntesis por reglas (no es del doc): qué destaca, qué queda por debajo y señales a revisar. */
function ProfileBand({ founder, peer }: { founder: FounderHdd; peer: Peer | null }) {
  const lines = buildProfile(founder, peer?.avg);
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-[var(--column-band)] px-3 py-2 text-xs md:grid-cols-2" aria-label="Perfil (síntesis automática)" title="Síntesis automática por reglas, no es una lectura del doc ni una puntuación">
      {lines.map((l) => (
        <li key={l.label} className="flex items-start gap-2">
          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_COLOR[l.tone] }} />
          <span className="text-[var(--text-secondary)]"><b className="text-[var(--text-primary)]">{l.label}:</b> {l.text}</span>
        </li>
      ))}
    </ul>
  );
}

function FounderRow({ founder, allFounders }: { founder: FounderHdd; allFounders: FounderHdd[] }) {
  const peer = peerOf(allFounders, founder.personId);
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

      <ProfileBand founder={founder} peer={peer} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-12">
        <section className="md:col-span-5" aria-label="Soft skills">
          <Label>Soft skills · 1-10 · con KPIs del Legal Maze</Label>
          {hasSoft ? <SoftRadar founder={founder} peer={peer} /> : <p className="text-xs italic text-[var(--text-muted)]">Sin evaluaciones aún</p>}
        </section>

        <div className="flex flex-col gap-5 md:col-span-7">
          <section aria-label="Hard skills">
            <Label>Hard skills · 1-10</Label>
            {HARD_KEYS.some((k) => typeof founder.hard[k] === "number") ? (
              <div className="flex flex-col gap-1.5">
                {HARD_KEYS.map((k) => <MiniBar key={k} label={HARD_LABEL[k]} value={founder.hard[k]} color="var(--series-2)" />)}
              </div>
            ) : (
              <p className="text-xs italic text-[var(--text-muted)]">Sin valoraciones</p>
            )}
          </section>
          <section aria-label="Bienestar">
            <Label>Bienestar · pre → post</Label>
            <WellbeingCompact founder={founder} />
          </section>
        </div>
      </div>

      <section aria-label="Legal Maze">
        <Label>Legal Maze · respuesta y lectura</Label>
        <LegalCompact founder={founder} />
      </section>
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
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {TEAM_KEYS.map((k) => {
        const s = startup.team[k];
        const has = !!s && s.n > 0;
        const title = has ? `n=${s.n} · ${EVENTS.map((e) => `${EVENT_SHORT[e]} ${s.byEvent[e] ? fmt(s.byEvent[e]!.avg) : "—"}`).join(" · ")}` : "Sin evaluaciones";
        return <MiniBar key={k} label={TEAM_LABEL[k]} value={has ? s.avg : null} color="var(--series-1)" title={title} stacked />;
      })}
    </div>
  );
}

/** Ficha de una startup en formato informe: cabecera, KPIs de equipo y una fila compacta por founder. */
export function StartupReport({ startup, allStartups, onOpen }: { startup: StartupHdd; allStartups: StartupHdd[]; onOpen?: () => void }) {
  const allFounders = allStartups.flatMap((x) => x.founders);
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
          : startup.founders.map((f) => <FounderRow key={f.personId} founder={f} allFounders={allFounders} />)}
      </div>
      <WellbeingScatter startups={allStartups} selectedId={startup.startupId} compact />
    </section>
  );
}
