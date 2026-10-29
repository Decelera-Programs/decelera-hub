"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import type { FounderHdd, SoftKpiKey, WellbeingTake } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import { fmt, HARD_KEYS, HARD_LABEL, initials } from "./labels";

export interface SoftPeer { avg: Partial<Record<SoftKpiKey, number>>; count: number }

export function RadarLegend({ peer }: { peer: SoftPeer | null }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-[var(--text-muted)]">
      <span className="inline-flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--series-1)" }} />Founder</span>
      {peer && (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--brand-sun)" }} />
          Media del resto ({peer.count} {peer.count === 1 ? "founder" : "founders"})
        </span>
      )}
    </p>
  );
}

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
    <article className="card spotlight flex flex-col gap-4 p-6 shadow-sm" aria-label={`Founder ${founder.fullName}`}>
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
