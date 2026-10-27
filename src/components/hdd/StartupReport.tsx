"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { legalMazeFlags } from "@/lib/hdd/aggregate";
import { EM_COMMENTS } from "@/lib/hdd/emComments";
import { blendLegal, LEGAL_SCORE, legalSoftScores, legalTone, type LegalTone } from "@/lib/hdd/legalScore";
import { LEGAL_MAZE_CONTENT } from "@/lib/hdd/legalMazeContent";
import type { FounderHdd, SoftKpiKey, StartupHdd, WellbeingTake } from "@/lib/hdd/types";
import { RadarLegend, type SoftPeer } from "./FounderCard";
import { buildProfile } from "./profile";
import { WellbeingScatter } from "./WellbeingScatter";
import { EVENTS, EVENT_SHORT, fmt, HARD_KEYS, HARD_LABEL, initials, SOFT_KEYS, SOFT_LABEL, SOFT_SHORT, TEAM_KEYS, TEAM_LABEL } from "./labels";

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

const LEGAL_COLS: Record<number, string> = {
  1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5",
};
const TONE: Record<LegalTone, { color: string; label: string }> = {
  good: { color: "var(--status-good)", label: "Positivo" },
  mid: { color: "var(--status-warning)", label: "Intermedio" },
  bad: { color: "var(--status-critical)", label: "A vigilar" },
};

/** Legal Maze en horizontal: por dilema, la respuesta en pequeño y gris y la conclusión en verde, amarillo o rojo según la nota.
 *  Solo se muestran los dilemas que ha contestado alguien (`visible`). */
function LegalCompact({ founder, visible }: { founder: FounderHdd; visible: ReadonlySet<string> }) {
  const lm = founder.legalMaze;
  if (!lm || !lm.dilemmas.length) return <p className="text-xs italic text-[var(--text-muted)]">Sin completar</p>;
  const byId = new Map(lm.dilemmas.map((d) => [d.id, d]));
  const flag = legalMazeFlags(lm.dilemmas).d1ChoseA;
  const shown = LEGAL_MAZE_CONTENT.filter((c) => visible.has(c.id));
  return (
    <ul className={`grid grid-cols-1 gap-2 leading-snug sm:grid-cols-2 ${LEGAL_COLS[shown.length] ?? "xl:grid-cols-5"}`}>
      {shown.map((c) => {
        const d = byId.get(c.id);
        const opt = typeof d?.choice === "number" ? c.options[d.choice] : null;
        const score = opt && d && typeof d.choice === "number" ? LEGAL_SCORE[c.id]?.[d.choice] : undefined;
        const tone = score != null ? TONE[legalTone(score)] : null;
        return (
          <li key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] p-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-primary)]">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">{opt ? opt.letter : "—"}</span>
              {c.id} · {c.theme}
              <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">{c.kpiLabel}</span>
            </span>
            {opt ? (
              <>
                <span className="text-[10px] text-[var(--text-muted)]">{opt.short}</span>
                <span
                  className="rounded-md border-l-4 px-2 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                  style={tone ? { borderColor: tone.color, background: `color-mix(in srgb, ${tone.color} 14%, transparent)` } : { borderColor: "var(--border)" }}
                >
                  {tone && <span className="block text-[10px] font-semibold uppercase tracking-wide" style={{ color: tone.color }}>{tone.label} · {score}/10</span>}
                  {opt.gist}
                </span>
                {c.id === "D1" && flag && <span className="text-[10px] text-[var(--status-critical)]">Es la casilla que más pesa según el doc.</span>}
              </>
            ) : (
              <span className="text-[11px] italic text-[var(--text-muted)]">{d ? "Sin opción elegida" : "Sin respuesta"}</span>
            )}
            {d?.answer && <span className="line-clamp-2 text-[10px] italic text-[var(--text-muted)]" title={d.answer}>“{d.answer}”</span>}
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
  for (const f of others) if (SOFT_KEYS.some((k) => f.soft[k] != null)) count++;
  for (const k of SOFT_KEYS) {
    const v = others.map((f) => f.soft[k]?.avg ?? null).filter((x): x is number => x != null);
    if (v.length) avg[k] = v.reduce((a, b) => a + b, 0) / v.length;
  }
  return count ? { avg, count } : null;
}

/** `founder` trae las soft skills ya mezcladas con el Legal Maze; `raw` es el original, para el desglose del tooltip. */
function SoftRadar({ founder, raw, peer }: { founder: FounderHdd; raw: FounderHdd; peer: Peer | null }) {
  const lm = legalSoftScores(raw);
  const data = SOFT_KEYS.map((k) => ({
    skill: `${SOFT_SHORT[k]}${lm[k] != null ? "*" : ""}`, full: SOFT_LABEL[k], value: founder.soft[k]?.n ? founder.soft[k]!.avg : (lm[k] ?? 0), peer: peer?.avg[k] ?? null, n: founder.soft[k]?.n ?? 0,
    byEvent: EVENTS.map((e) => `${EVENT_SHORT[e]} ${founder.soft[k]?.byEvent[e] ? fmt(founder.soft[k]!.byEvent[e]!.avg) : "—"}`).join(" · "),
    blend: lm[k] != null ? (raw.soft[k]?.n ? `equipo ${fmt(raw.soft[k]!.avg)} · Legal Maze ${fmt(lm[k])}` : `solo Legal Maze ${fmt(lm[k])} (sin evaluación del equipo)`) : null,
  }));
  return (
    <div className="flex flex-col gap-1">
      <div className="h-64 w-full" role="img" aria-label={`Radar de soft skills de ${founder.fullName}`}>
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
                    <p className="text-[var(--text-secondary)]">{p.n || p.blend ? `${fmt(p.value)}${p.n ? ` · n=${p.n}` : ""}` : "Sin evaluaciones"}{p.peer != null && ` · media resto ${fmt(p.peer)}`}</p>
                    {p.blend && <p className="text-[var(--text-muted)]">{p.blend}</p>}
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
      {SOFT_KEYS.some((k) => lm[k] != null) && <p className="text-[10px] text-[var(--text-muted)]">* Incluye el Legal Maze (media con la evaluación del equipo).</p>}
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

function FounderRow({ founder, allFounders, legalVisible }: { founder: FounderHdd; allFounders: FounderHdd[]; legalVisible: ReadonlySet<string> }) {
  const peer = peerOf(allFounders, founder.personId);
  const blended = blendLegal(founder);
  const [broken, setBroken] = useState(false);
  const evals = founder.evaluations.length;
  const hasSoft = SOFT_KEYS.some((k) => (founder.soft[k]?.n ?? 0) > 0) || Object.keys(legalSoftScores(founder)).length > 0;
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

      <ProfileBand founder={blended} peer={peer} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-12">
        <section className="md:col-span-5" aria-label="Soft skills">
          <Label>Soft skills · 1-10</Label>
          {hasSoft ? <SoftRadar founder={blended} raw={founder} peer={peer} /> : <p className="text-xs italic text-[var(--text-muted)]">Sin evaluaciones aún</p>}
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
        <LegalCompact founder={founder} visible={legalVisible} />
      </section>
    </article>
  );
}

/** Etiqueta de eje que parte los nombres largos en varias líneas y se recoloca según su posición respecto al centro. */
function WrapTick({ x: rx = 0, y: ry = 0, cy: rcy = 0, payload, textAnchor }: {
  x?: number | string; y?: number | string; cy?: number | string; payload?: { value: string | number }; textAnchor?: "start" | "middle" | "end" | "inherit";
}) {
  const x = Number(rx), y = Number(ry), cy = Number(rcy);
  const lines: string[] = [];
  for (const w of String(payload?.value ?? "").split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + w.length < 14) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  // Arriba: las líneas crecen hacia arriba; a los lados, centradas en vertical; abajo: hacia abajo.
  const first = y < cy - 8 ? -(lines.length - 1) * 11 : Math.abs(y - cy) <= 8 ? -(lines.length - 1) * 5.5 : 0;
  return (
    <text x={x} y={y + first} textAnchor={textAnchor} fill="var(--text-secondary)" fontSize={10}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>{l}</tspan>)}
    </text>
  );
}

/** KPIs de equipo y hard skills (el mayor entre los founders) de una startup. null = sin dato. */
function teamValues(st: StartupHdd): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const k of TEAM_KEYS) out[k] = (st.team[k]?.n ?? 0) > 0 ? st.team[k]!.avg : null;
  for (const k of HARD_KEYS) {
    const v = st.founders.map((f) => f.hard[k]).filter((x): x is number => typeof x === "number");
    out[k] = v.length ? Math.max(...v) : null;
  }
  return out;
}

/** Araña del equipo: 4 KPIs de equipo + 3 hard skills (de los founders, se toma el mayor), frente a la media del resto de equipos. */
function TeamRadar({ startup, allStartups }: { startup: StartupHdd; allStartups: StartupHdd[] }) {
  if (startup.founders.length < 2) {
    return <p className="text-xs italic text-[var(--text-muted)]">Un solo founder: no hay KPIs de equipo.</p>;
  }
  const mine = teamValues(startup);
  const others = allStartups.filter((x) => x.startupId !== startup.startupId && x.founders.length >= 2).map(teamValues);
  const peerOfAxis = (k: string) => {
    const v = others.map((o) => o[k]).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const peerTeams = others.filter((o) => Object.values(o).some((x) => x != null)).length;
  const data = [
    ...TEAM_KEYS.map((k) => {
      const st = startup.team[k];
      const has = mine[k] != null;
      return {
        axis: TEAM_LABEL[k], full: TEAM_LABEL[k], value: mine[k] ?? 0, has, peer: peerOfAxis(k),
        note: has && st ? `n=${st.n} · ${EVENTS.map((e) => `${EVENT_SHORT[e]} ${st.byEvent[e] ? fmt(st.byEvent[e]!.avg) : "—"}`).join(" · ")}` : "Sin evaluaciones",
      };
    }),
    ...HARD_KEYS.map((k) => ({
      axis: HARD_LABEL[k], full: `${HARD_LABEL[k]} (hard skill)`, value: mine[k] ?? 0, has: mine[k] != null, peer: peerOfAxis(k), note: "El mayor entre los founders",
    })),
  ];
  if (!data.some((d) => d.has)) return <p className="text-xs italic text-[var(--text-muted)]">Sin evaluaciones de equipo aún.</p>;
  const hasPeer = peerTeams > 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-64 w-full" role="img" aria-label="Radar del equipo: KPIs de equipo y hard skills">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 22, right: 76, bottom: 22, left: 76 }} outerRadius="92%">
            <PolarGrid stroke="var(--gridline)" />
            <PolarAngleAxis dataKey="axis" tick={(props) => <WrapTick {...props} />} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={3} tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div className="card px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-[var(--text-primary)]">{p.full}</p>
                    <p className="text-[var(--text-secondary)]">{p.has ? fmt(p.value) : "—"}{p.peer != null && ` · media resto ${fmt(p.peer)}`}</p>
                    <p className="text-[var(--text-muted)]">{p.note}</p>
                  </div>
                );
              }}
            />
            {hasPeer && <Radar dataKey="peer" stroke="var(--series-3)" strokeWidth={1.5} strokeOpacity={0.7} fill="var(--brand-sun)" fillOpacity={0.14} />}
            <Radar dataKey="value" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--series-1)" }} />Este equipo</span>
        {hasPeer && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--brand-sun)" }} />
            Media del resto ({peerTeams} {peerTeams === 1 ? "equipo" : "equipos"} de 2 o más founders)
          </span>
        )}
      </p>
    </div>
  );
}

/** Comentarios de los Experience Makers sobre el equipo, curados: lo positivo y lo que vigilar, con quién lo dice. */
function EmComments({ name }: { name: string }) {
  const items = EM_COMMENTS[name];
  if (!items?.length) return null;
  const groups = [
    { tone: "pos", label: "Lo positivo", color: "var(--status-good)" },
    { tone: "neg", label: "A vigilar", color: "var(--status-critical)" },
  ] as const;
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border)] pt-3" aria-label="Comentarios de los Experience Makers">
      <Label>Lo que dicen los Experience Makers</Label>
      {groups.map((g) => {
        const xs = items.filter((i) => i.tone === g.tone);
        if (!xs.length) return null;
        return (
          <div key={g.tone}>
            <p className="mb-1 text-[11px] font-semibold" style={{ color: g.color }}>{g.label}</p>
            <ul className="flex flex-col gap-1.5">
              {xs.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-snug">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: g.color }} />
                  <span className="text-[var(--text-primary)]">
                    {c.text} <span className="text-[var(--text-muted)]">— {c.who}{c.about ? ` · sobre ${c.about}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Ficha de una startup en formato informe: cabecera, KPIs de equipo y una fila compacta por founder. */
export function StartupReport({ startup, allStartups, onOpen }: { startup: StartupHdd; allStartups: StartupHdd[]; onOpen?: () => void }) {
  const allFounders = allStartups.flatMap((x) => x.founders).map(blendLegal);
  const legalVisible = new Set(
    LEGAL_MAZE_CONTENT.filter((c) => allFounders.some((f) => typeof f.legalMaze?.dilemmas.find((d) => d.id === c.id)?.choice === "number")).map((c) => c.id),
  );
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-[var(--column-band)] p-4">
          <Label>Equipo · 1-10 · con hard skills (el mayor entre founders)</Label>
          <TeamRadar startup={startup} allStartups={allStartups} />
          <EmComments name={startup.name} />
        </div>
        <WellbeingScatter startups={allStartups} selectedId={startup.startupId} compact mini />
      </div>

      <div className="flex flex-col divide-y divide-[var(--border)]">
        {startup.founders.length === 0
          ? <p className="text-sm italic text-[var(--text-muted)]">Sin founders en HDD</p>
          : startup.founders.map((f) => <FounderRow key={f.personId} founder={f} allFounders={allFounders} legalVisible={legalVisible} />)}
      </div>
    </section>
  );
}
