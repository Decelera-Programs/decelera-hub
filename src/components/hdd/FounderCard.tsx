"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FounderHdd, WellbeingTake } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import {
  EVENTS, EVENT_SHORT, fmt, HARD_KEYS, HARD_LABEL, initials, SOFT_KEYS, SOFT_LABEL, SOFT_SHORT,
} from "./labels";

function Avatar({ founder }: { founder: FounderHdd }) {
  const [broken, setBroken] = useState(false);
  if (founder.photoUrl && !broken) {
    return (
      <img
        src={founder.photoUrl}
        alt=""
        onError={() => setBroken(true)}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold"
      style={{ background: "var(--tile-1-bg)", color: "var(--tile-1-ink)" }}
    >
      {initials(founder.fullName)}
    </span>
  );
}

function Bar({ value, color, label }: { value: number | undefined | null; color: string; label: string }) {
  const has = typeof value === "number" && Number.isFinite(value);
  return (
    <div role="img" aria-label={`${label}: ${has ? fmt(value) : "sin datos"}`} className="h-2 overflow-hidden rounded-full bg-[var(--column-band)]">
      {has && <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / 10) * 100))}%`, background: color }} />}
    </div>
  );
}

export function SoftSkills({ founder }: { founder: FounderHdd }) {
  const [mode, setMode] = useState<"radar" | "bars">("radar");
  const hasAny = SOFT_KEYS.some((k) => (founder.soft[k]?.n ?? 0) > 0);
  const totalEvals = founder.evaluations.length;
  if (!hasAny) return <Empty>Sin evaluaciones aún</Empty>;
  const data = SOFT_KEYS.map((k) => ({
    skill: SOFT_SHORT[k],
    full: SOFT_LABEL[k],
    value: founder.soft[k]?.avg ?? 0,
    n: founder.soft[k]?.n ?? 0,
  }));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)]">
          {totalEvals} {totalEvals === 1 ? "evaluación" : "evaluaciones"} · escala 1 a 10
        </span>
        <div role="group" aria-label="Vista de soft skills" className="flex gap-1 rounded-full border border-[var(--border)] p-0.5">
          {(["radar", "bars"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={mode === m ? { background: "var(--series-1)", color: "#fff" } : { color: "var(--text-secondary)" }}
            >
              {m === "radar" ? "Radar" : "Barras"}
            </button>
          ))}
        </div>
      </div>
      {mode === "radar" ? (
        <>
          <div className="h-72 w-full" role="img" aria-label={`Radar de soft skills de ${founder.fullName}`}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="70%">
                <PolarGrid stroke="var(--gridline)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={3} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="card px-3 py-2 text-sm shadow-md">
                        <p className="font-medium text-[var(--text-primary)]">{p.full}</p>
                        <p className="text-[var(--text-secondary)]">{p.n ? `${fmt(p.value)} · n=${p.n}` : "Sin evaluaciones"}</p>
                      </div>
                    );
                  }}
                />
                <Radar dataKey="value" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {SOFT_KEYS.map((k) => {
              const s = founder.soft[k];
              const has = !!s && s.n > 0;
              return (
                <li key={k} className="flex justify-between gap-2 text-[var(--text-secondary)]">
                  <span>{SOFT_LABEL[k]}</span>
                  <span className="font-medium text-[var(--text-primary)]">{has ? `${fmt(s.avg)} (n=${s.n})` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {SOFT_KEYS.map((k) => {
            const s = founder.soft[k];
            const has = !!s && s.n > 0;
            return (
              <li key={k} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-[var(--text-primary)]">{SOFT_LABEL[k]}</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {has ? fmt(s.avg) : "—"}
                    {has && <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">n={s.n}</span>}
                  </span>
                </div>
                <Bar value={has ? s.avg : null} color="var(--series-1)" label={SOFT_LABEL[k]} />
                {has && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {EVENTS.map((e) => `${EVENT_SHORT[e]} ${s.byEvent[e] ? fmt(s.byEvent[e].avg) : "—"}`).join(" · ")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function HardSkills({ founder }: { founder: FounderHdd }) {
  if (!HARD_KEYS.some((k) => typeof founder.hard[k] === "number")) return <Empty>Sin valoraciones de hard skills aún</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {HARD_KEYS.map((k) => {
        const v = founder.hard[k];
        return (
          <li key={k} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-primary)]">{HARD_LABEL[k]}</span>
              <span className="font-semibold text-[var(--text-primary)]">{fmt(v)}</span>
            </div>
            <Bar value={v} color="var(--series-2)" label={HARD_LABEL[k]} />
          </li>
        );
      })}
    </ul>
  );
}

function Delta({ pre, post, lowerIsBetter }: { pre: number | null; post: number | null; lowerIsBetter: boolean }) {
  if (pre == null || post == null) return <span className="text-[var(--text-muted)]">—</span>;
  const d = post - pre;
  if (!Number.isFinite(d)) return <span className="text-[var(--text-muted)]">—</span>;
  if (Math.abs(d) < 0.005) return <span className="text-[var(--text-muted)]">sin cambio</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span className="font-medium" style={{ color: good ? "var(--status-good)" : "var(--status-critical)" }}>
      {d > 0 ? "▲ +" : "▼ "}
      {fmt(d, 2)} <span className="sr-only">{good ? "mejora" : "empeora"}</span>
    </span>
  );
}

export function Wellbeing({ founder }: { founder: FounderHdd }) {
  const { pre, post } = founder.wellbeing;
  if (!pre && !post) return <Empty>Sin respuestas de bienestar aún</Empty>;
  const rows: { key: keyof Omit<WellbeingTake, "completedAt">; label: string; lowerIsBetter: boolean; note: string }[] = [
    { key: "exhaustion", label: "Exhaustion", lowerIsBetter: true, note: "OLBI · 1 a 4 · menos es mejor" },
    { key: "disengagement", label: "Disengagement from Work", lowerIsBetter: true, note: "OLBI · 1 a 4 · menos es mejor" },
    { key: "resilience", label: "Resilience", lowerIsBetter: false, note: "BRS · 1 a 5 · más es mejor" },
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-[var(--text-muted)]">
          <th scope="col" className="py-1 font-medium">Medida</th>
          <th scope="col" className="py-1 text-right font-medium">Pre</th>
          <th scope="col" className="py-1 text-right font-medium">Post</th>
          <th scope="col" className="py-1 text-right font-medium">Cambio</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row" className="py-1.5 text-left font-normal text-[var(--text-primary)]">
              {r.label}
              <span className="block text-xs text-[var(--text-muted)]">{r.note}</span>
            </th>
            <td className="py-1.5 text-right text-[var(--text-primary)]">{fmt(pre?.[r.key], 2)}</td>
            <td className="py-1.5 text-right text-[var(--text-primary)]">{fmt(post?.[r.key], 2)}</td>
            <td className="py-1.5 text-right">
              <Delta pre={pre?.[r.key] ?? null} post={post?.[r.key] ?? null} lowerIsBetter={r.lowerIsBetter} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tarjeta de un founder dentro de una sección: foto y nombre, y el contenido de esa sección. */
export function FounderPanel({ founder, hint, children }: { founder: FounderHdd; hint?: string; children: ReactNode }) {
  return (
    <article className="card flex flex-col gap-4 p-6 shadow-sm" aria-label={`Founder ${founder.fullName}`}>
      <header className="flex items-center gap-3">
        <Avatar founder={founder} />
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{founder.fullName}</h3>
          {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
        </div>
      </header>
      {children}
    </article>
  );
}
