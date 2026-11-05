"use client";

import { useMemo, useState } from "react";
import { PanZoom } from "@/components/agents/PanZoom";
import {
  flowCount,
  MAP_AGENTS,
  MAP_FLOWS,
  MAP_HEIGHT,
  MAP_SYSTEMS,
  MAP_WIDTH,
  NODE_H,
  NODE_W,
  type MapAgentId,
  type MapFlow,
  type MapSystem,
} from "@/lib/systems-map";

/**
 * Mapa de sistemas: nodos = dónde viven los datos, flechas = lo que mueve cada agente (ver systems-map.ts).
 * Pinchar un agente (leyenda o tarjeta) deja solo sus flechas; pinchar un sistema, solo las que lo tocan.
 * Las flechas con actividad en los últimos 7 días llevan la cifra y el trazo animado de FlowDiagram.
 */

type Pt = { x: number; y: number };
type Side = "left" | "right" | "top" | "bottom";
type Geo = { flow: MapFlow; d: string; label: Pt; count: number | null };

const SPREAD = 14; // separación entre flechas que salen/entran por el mismo lado de un nodo
const LABEL_H = 22;

const byId = Object.fromEntries(MAP_SYSTEMS.map((s) => [s.id, s]));
const agentColor = Object.fromEntries(MAP_AGENTS.map((a) => [a.id, a.color])) as Record<MapAgentId, string>;

function center(s: MapSystem): Pt {
  return { x: s.x + NODE_W / 2, y: s.y + NODE_H / 2 };
}

function sides(f: MapFlow): [Side, Side] {
  const a = center(byId[f.from]);
  const b = center(byId[f.to]);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.6) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}

function anchor(s: MapSystem, side: Side, offset: number): Pt {
  switch (side) {
    case "left":
      return { x: s.x, y: s.y + NODE_H / 2 + offset };
    case "right":
      return { x: s.x + NODE_W, y: s.y + NODE_H / 2 + offset };
    case "top":
      return { x: s.x + NODE_W / 2 + offset, y: s.y };
    case "bottom":
      return { x: s.x + NODE_W / 2 + offset, y: s.y + NODE_H };
  }
}

function bezierAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function labelWidth(f: MapFlow, count: number | null) {
  return 26 + f.label.length * 6.2 + (count !== null ? 22 : 0);
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Trazado de todas las flechas: reparte los puntos de anclaje por lado y coloca cada etiqueta donde no pise
 * ni un nodo ni otra etiqueta (prueba varios puntos de la curva). Determinista: no depende del render. */
function layout(counts: Record<string, Record<string, number>>): Geo[] {
  const slots = new Map<string, MapFlow[]>();
  const sideOf = new Map<string, [Side, Side]>();
  for (const f of MAP_FLOWS) {
    if (f.from === f.to) continue;
    const [sa, sb] = sides(f);
    sideOf.set(f.id, [sa, sb]);
    for (const [node, side] of [[f.from, sa], [f.to, sb]] as const) {
      const k = `${node}:${side}`;
      if (!slots.has(k)) slots.set(k, []);
      slots.get(k)!.push(f);
    }
  }
  // Orden dentro de cada lado según dónde está el otro extremo, para que las flechas no se crucen al salir.
  for (const [k, list] of slots) {
    const [node, side] = k.split(":");
    const vertical = side === "left" || side === "right";
    list.sort((p, q) => {
      const op = center(byId[p.from === node ? p.to : p.from]);
      const oq = center(byId[q.from === node ? q.to : q.from]);
      return vertical ? op.y - oq.y : op.x - oq.x;
    });
  }
  const offset = (node: string, side: Side, f: MapFlow) => {
    const list = slots.get(`${node}:${side}`)!;
    return (list.indexOf(f) - (list.length - 1) / 2) * SPREAD;
  };

  const nodeBoxes = MAP_SYSTEMS.map((s) => ({ x: s.x - 6, y: s.y - 6, w: NODE_W + 12, h: NODE_H + 12 }));
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const out: Geo[] = [];

  for (const f of MAP_FLOWS) {
    const count = flowCount(f, counts);
    const w = labelWidth(f, count);
    if (f.from === f.to) {
      // Bucle encima del nodo (el agente lee y escribe en el mismo sistema).
      const s = byId[f.from];
      const a = { x: s.x + NODE_W * 0.32, y: s.y };
      const b = { x: s.x + NODE_W * 0.68, y: s.y };
      const top = s.y - 58;
      const d = `M ${a.x} ${a.y} C ${a.x - 10} ${top}, ${b.x + 10} ${top}, ${b.x} ${b.y}`;
      const label = { x: s.x + NODE_W / 2, y: top + 2 };
      placed.push({ x: label.x - w / 2, y: label.y - LABEL_H / 2, w, h: LABEL_H });
      out.push({ flow: f, d, label, count });
      continue;
    }
    const [sa, sb] = sideOf.get(f.id)!;
    const A = anchor(byId[f.from], sa, offset(f.from, sa, f));
    const B = anchor(byId[f.to], sb, offset(f.to, sb, f));
    const horizontal = sa === "left" || sa === "right";
    const k = horizontal ? (B.x - A.x) / 2 : (B.y - A.y) / 2;
    const P1 = horizontal ? { x: A.x + k, y: A.y } : { x: A.x, y: A.y + k };
    const P2 = horizontal ? { x: B.x - k, y: B.y } : { x: B.x, y: B.y - k };
    const d = `M ${A.x} ${A.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${B.x} ${B.y}`;

    let label = bezierAt(A, P1, P2, B, 0.5);
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]) {
      const p = bezierAt(A, P1, P2, B, t);
      const box = { x: p.x - w / 2, y: p.y - LABEL_H / 2, w, h: LABEL_H };
      if (![...nodeBoxes, ...placed].some((o) => overlaps(box, o))) {
        label = p;
        break;
      }
    }
    placed.push({ x: label.x - w / 2, y: label.y - LABEL_H / 2, w, h: LABEL_H });
    out.push({ flow: f, d, label, count });
  }
  return out;
}

export function SystemsMap({ counts }: { counts: Record<string, Record<string, number>> }) {
  const [agent, setAgent] = useState<MapAgentId | null>(null);
  const [node, setNode] = useState<string | null>(null);
  const geo = useMemo(() => layout(counts), [counts]);

  const isOn = (f: MapFlow) => (agent ? f.agent === agent : node ? f.from === node || f.to === node : true);
  const nodeOn = (s: MapSystem) =>
    agent ? MAP_FLOWS.some((f) => f.agent === agent && (f.from === s.id || f.to === s.id)) : node ? node === s.id || MAP_FLOWS.some((f) => (f.from === node && f.to === s.id) || (f.to === node && f.from === s.id)) : true;

  function pickAgent(id: MapAgentId) {
    setNode(null);
    setAgent((a) => (a === id ? null : id));
  }
  function pickNode(id: string) {
    setAgent(null);
    setNode((n) => (n === id ? null : id));
  }

  const visibleFlows = MAP_FLOWS.filter(isOn);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {MAP_AGENTS.map((a) => {
          const on = agent === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pickAgent(a.id)}
              aria-pressed={on}
              className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm transition-all"
              style={{
                borderColor: on ? a.color : "var(--border)",
                background: on ? `color-mix(in srgb, ${a.color} 14%, var(--surface-1))` : "var(--surface-1)",
                color: on ? a.color : "var(--text-primary)",
                opacity: agent && !on ? 0.55 : 1,
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
              {a.emoji} {a.label}
            </button>
          );
        })}
        {(agent || node) && (
          <button
            type="button"
            onClick={() => {
              setAgent(null);
              setNode(null);
            }}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--row-hover)]"
          >
            Ver todo
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--text-muted)]">Cifras: últimos 7 días</span>
      </div>

      <div className="card spotlight overflow-hidden p-2 sm:p-3">
        <PanZoom width={MAP_WIDTH} height={MAP_HEIGHT} viewportClassName="h-[460px] sm:h-[680px]">
          <div
            className="relative rounded-2xl"
            style={{
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              backgroundImage: "radial-gradient(color-mix(in srgb, var(--text-primary) 10%, transparent) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            {/* Zonas: de dónde entra · dónde se guarda · dónde se avisa */}
            {[
              { x: 16, label: "Entra" },
              { x: 476, label: "Se guarda" },
              { x: 938, label: "Se avisa / se actúa" },
            ].map((z) => (
              <span key={z.label} className="absolute top-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]" style={{ left: z.x }}>
                {z.label}
              </span>
            ))}

            <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="absolute inset-0" aria-hidden>
              <defs>
                {MAP_AGENTS.map((a) => (
                  <marker key={a.id} id={`arrow-${a.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={a.color} />
                  </marker>
                ))}
              </defs>
              {geo.map((g) => {
                const on = isOn(g.flow);
                const live = (g.count ?? 0) > 0;
                return (
                  <path
                    key={g.flow.id}
                    d={g.d}
                    fill="none"
                    stroke={agentColor[g.flow.agent]}
                    strokeWidth={on ? 2.2 : 1.5}
                    strokeLinecap="round"
                    opacity={on ? 0.85 : 0.1}
                    markerEnd={`url(#arrow-${g.flow.agent})`}
                    className={on && live ? "flow-edge-animated" : undefined}
                    style={{ transition: "opacity 0.2s" }}
                  />
                );
              })}
            </svg>

            {geo.map((g) => {
              const on = isOn(g.flow);
              const color = agentColor[g.flow.agent];
              return (
                <span
                  key={g.flow.id}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border bg-[var(--surface-1)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-primary)] shadow-sm"
                  style={{
                    left: g.label.x,
                    top: g.label.y,
                    borderColor: `color-mix(in srgb, ${color} 35%, var(--border))`,
                    opacity: on ? 1 : 0.12,
                    transition: "opacity 0.2s",
                  }}
                  title={`${MAP_AGENTS.find((a) => a.id === g.flow.agent)?.label} · ${g.flow.when}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {g.flow.label}
                  {g.count !== null && (
                    <span
                      className="rounded-full px-1.5 text-[10px] font-bold tabular-nums"
                      style={{
                        background: g.count > 0 ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--pill-neutral-bg)",
                        color: g.count > 0 ? color : "var(--text-muted)",
                      }}
                    >
                      {g.count}
                    </span>
                  )}
                </span>
              );
            })}

            {MAP_SYSTEMS.map((s) => {
              const on = nodeOn(s);
              const selected = node === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-nopan
                  onClick={() => pickNode(s.id)}
                  aria-pressed={selected}
                  className="absolute flex items-center gap-3 rounded-2xl border bg-[var(--surface-1)] px-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    left: s.x,
                    top: s.y,
                    width: NODE_W,
                    height: NODE_H,
                    opacity: on ? 1 : 0.3,
                    borderColor: selected ? "var(--brand-sea)" : "var(--border)",
                    boxShadow: selected ? "0 10px 26px -14px color-mix(in srgb, var(--brand-sea) 60%, transparent)" : undefined,
                  }}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${s.logo ? "border border-[var(--border)] bg-white" : "bg-[var(--pill-neutral-bg)]"}`}>
                    {s.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                    ) : (
                      s.icon
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.label}</span>
                    <span className="truncate text-[11px] text-[var(--text-muted)]">{s.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </PanZoom>
      </div>

      {/* Detalle: qué hace cada agente, flecha a flecha */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {MAP_AGENTS.map((a) => {
          const flows = visibleFlows.filter((f) => f.agent === a.id);
          const dim = (agent && agent !== a.id) || flows.length === 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pickAgent(a.id)}
              className="card flex flex-col gap-2 p-4 text-left transition-opacity"
              style={{ opacity: dim ? 0.45 : 1, borderColor: agent === a.id ? a.color : undefined }}
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {a.emoji} {a.label}
                </span>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{a.what}</span>
              <span className="flex flex-col gap-1 pt-1">
                {(flows.length ? flows : MAP_FLOWS.filter((f) => f.agent === a.id)).map((f) => {
                  const c = flowCount(f, counts);
                  return (
                    <span key={f.id} className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 truncate text-[var(--text-muted)]">
                        {byId[f.from].label} → {f.to === "gmail-out" ? "founder" : byId[f.to].label}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{f.label}</span>
                      <span className="shrink-0 text-[var(--text-muted)]">{f.when}</span>
                      {c !== null && <span className="w-6 shrink-0 text-right font-bold tabular-nums" style={{ color: c > 0 ? a.color : "var(--text-muted)" }}>{c}</span>}
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
