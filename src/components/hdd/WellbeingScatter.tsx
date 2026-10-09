"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import {
  BRS_HIGH, BRS_LOW, brsBand, buildScatterPoints, OLBI_MID, scatterQuadrant, scatterSeries, type ScatterMode, type ScatterSeries,
} from "@/lib/hdd/aggregate";
import type { StartupHdd } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import { fmt } from "./labels";

// Un color (--row-1..8, orden fijo y validado para categóricas) y una forma por startup, así la identidad
// no depende solo del color. A partir de la 9ª startup, y para "Sin startup", gris + círculo ("Otras").
const SHAPES = ["circle", "square", "triangle", "diamond", "cross", "triangleDown", "hexagon", "star"] as const;
type Shape = (typeof SHAPES)[number] | "circleOther";
interface Style { color: string; shape: Shape }
const OTHER: Style = { color: "var(--series-other)", shape: "circleOther" };

const MODES: { id: ScatterMode; label: string }[] = [
  { id: "pre", label: "Pre" },
  { id: "post", label: "Post" },
  { id: "delta", label: "Pre → Post" },
];

const QUADRANT_LABEL = {
  resiliente_comprometido: "Resiliente y comprometido",
  poco_resiliente_comprometido: "Poco resiliente, pero comprometido",
  resiliente_desconectado: "Resiliente, pero desconectado",
  poco_resiliente_desconectado: "Poco resiliente y desconectado",
} as const;

/** Radio de la marca según Exhaustion (OLBI 1 a 4): más grande = más agotamiento. Sin dato = tamaño medio. */
const radius = (exh: number | null) => (exh == null || !Number.isFinite(exh) ? 6.5 : 4.5 + ((Math.min(4, Math.max(1, exh)) - 1) / 3) * 5);

function symbolPath(shape: Shape, r: number): string | null {
  switch (shape) {
    case "square": return `M${-r},${-r}h${2 * r}v${2 * r}h${-2 * r}z`;
    case "triangle": return `M0,${-r * 1.2}L${r * 1.1},${r * 0.9}L${-r * 1.1},${r * 0.9}z`;
    case "triangleDown": return `M0,${r * 1.2}L${r * 1.1},${-r * 0.9}L${-r * 1.1},${-r * 0.9}z`;
    case "diamond": return `M0,${-r * 1.3}L${r * 1.3},0L0,${r * 1.3}L${-r * 1.3},0z`;
    case "cross": { const a = r * 0.45; return `M${-a},${-r}h${2 * a}v${r - a}h${r - a}v${2 * a}h${-(r - a)}v${r - a}h${-2 * a}v${-(r - a)}h${-(r - a)}v${-2 * a}h${r - a}z`; }
    case "hexagon": return `M${r},0L${r / 2},${r * 0.87}L${-r / 2},${r * 0.87}L${-r},0L${-r / 2},${-r * 0.87}L${r / 2},${-r * 0.87}z`;
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.5 : r * 1.3; const a = (Math.PI / 5) * i - Math.PI / 2; pts.push(`${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`); }
      return `M${pts.join("L")}z`;
    }
    default: return null; // circle
  }
}

function Mark({ x, y, shape, color, r, filled = true, opacity = 1 }: { x: number; y: number; shape: Shape; color: string; r: number; filled?: boolean; opacity?: number }) {
  const path = symbolPath(shape, r);
  // Anillo de 2px del color de la superficie para separar marcas que se solapan.
  const style = { fill: filled ? color : "var(--surface-1)", stroke: filled ? "var(--surface-1)" : color, strokeWidth: filled ? 1.5 : 2, opacity };
  return path ? <path transform={`translate(${x},${y})`} d={path} style={style} /> : <circle cx={x} cy={y} r={r} style={style} />;
}

interface Datum {
  resilience: number; disengagement: number; exhaustion: number | null; kind: "pre" | "post";
  name: string; startup: string; color: string; shape: Shape; dim: boolean; mode: ScatterMode;
  pre: ScatterSeries["point"]["pre"]; post: ScatterSeries["point"]["post"];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Datum }[] }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  const row = (label: string, t: Datum["pre"]) =>
    t ? (
      <p className="text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">{label}</span> BRS {fmt(t.resilience, 2)}
        {brsBand(t.resilience) ? ` (${brsBand(t.resilience)})` : ""} · Disengagement {fmt(t.disengagement, 2)} · Exhaustion {fmt(t.exhaustion, 2)}
      </p>
    ) : null;
  return (
    <div className="card max-w-xs px-3 py-2 text-xs shadow-md">
      <p className="text-sm font-medium text-[var(--text-primary)]">{d.name}</p>
      <p className="mb-1 text-[var(--text-muted)]">{d.startup}</p>
      {d.mode === "delta" ? <>{row("Pre", d.pre)}{row("Post", d.post)}</> : row(d.kind === "pre" ? "Pre" : "Post", d.kind === "pre" ? d.pre : d.post)}
      <p className="mt-1 text-[var(--text-muted)]">{QUADRANT_LABEL[scatterQuadrant(d)]}</p>
    </div>
  );
}

export function WellbeingScatter({ startups, selectedId }: { startups: StartupHdd[]; selectedId: string | null }) {
  const [mode, setMode] = useState<ScatterMode>("pre");

  // Estilo por startup estable (índice en la lista completa ordenada), no depende del filtro.
  const styles = useMemo(() => {
    const m = new Map<string, Style>();
    startups.filter((s) => s.startupId !== "sin-startup").forEach((s, i) => m.set(s.startupId, i < SHAPES.length ? { color: `var(--row-${i + 1})`, shape: SHAPES[i] } : OTHER));
    return m;
  }, [startups]);

  const all = useMemo(() => buildScatterPoints(startups), [startups]);
  const series = useMemo(() => scatterSeries(all, mode), [all, mode]);
  const selectedHas = selectedId ? series.some((s) => s.point.startupId === selectedId) : true;
  const styleOf = (sid: string): Style => styles.get(sid) ?? OTHER;
  const isDim = (sid: string) => selectedId !== null && sid !== selectedId;

  const noneAtAll = all.length === 0;
  const legend = [...new Map(series.map((s) => [s.point.startupId, s.point.startupName])).entries()].filter(([sid]) => !isDim(sid));

  return (
    <ChartCard
      title="Resiliencia vs desconexión"
      subtitle="Un punto por founder: Resiliencia (BRS, 1 a 5, más es mejor) frente a Disengagement from Work (OLBI, 1 a 4, menos es mejor). El tamaño es Exhaustion (OLBI, 1 a 4): más grande, más agotamiento."
    >
      {noneAtAll ? (
        <Empty>Aún no hay tomas completas de OLBI y BRS (hacen falta Resiliencia y Disengagement)</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <div role="group" aria-label="Toma de bienestar" className="flex w-fit gap-1 rounded-full border border-[var(--border)] p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={mode === m.id ? { background: "var(--series-1)", color: "#fff" } : { color: "var(--text-secondary)" }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {series.length === 0 ? (
            <Empty>{mode === "delta" ? "Ningún founder tiene a la vez toma pre y toma post completas" : `Ningún founder tiene toma ${mode === "pre" ? "pre" : "post"} completa`}</Empty>
          ) : (
            <>
              {!selectedHas && <p role="status" className="text-xs text-[var(--text-muted)]">Esta startup no tiene tomas completas en esta vista; se muestra el resto en gris como contexto.</p>}
              <div className="overflow-x-auto">
                <div className="h-[440px] min-w-[520px]" role="img" aria-label="Gráfico de dispersión de resiliencia frente a disengagement por founder; los mismos datos están en la tabla de abajo">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
                      <CartesianGrid stroke="var(--gridline)" strokeDasharray="3 3" />
                      {/* Cuadrantes: corte BRS 3,0 (baja/normal) y punto medio OLBI 2,5. Eje Y invertido: arriba = menos desconexión. */}
                      <ReferenceArea x1={BRS_LOW} x2={5} y1={1} y2={OLBI_MID} fill="var(--status-good)" fillOpacity={0.06} stroke="none" label={{ value: QUADRANT_LABEL.resiliente_comprometido, position: "insideTopRight", fill: "var(--text-secondary)", fontSize: 11 }} />
                      <ReferenceArea x1={1} x2={BRS_LOW} y1={1} y2={OLBI_MID} fill="var(--series-1)" fillOpacity={0.04} stroke="none" label={{ value: QUADRANT_LABEL.poco_resiliente_comprometido, position: "insideTopLeft", fill: "var(--text-secondary)", fontSize: 11 }} />
                      <ReferenceArea x1={BRS_LOW} x2={5} y1={OLBI_MID} y2={4} fill="var(--status-warning)" fillOpacity={0.06} stroke="none" label={{ value: QUADRANT_LABEL.resiliente_desconectado, position: "insideBottomRight", fill: "var(--text-secondary)", fontSize: 11 }} />
                      <ReferenceArea x1={1} x2={BRS_LOW} y1={OLBI_MID} y2={4} fill="var(--status-critical)" fillOpacity={0.08} stroke="none" label={{ value: QUADRANT_LABEL.poco_resiliente_desconectado, position: "insideBottomLeft", fill: "var(--text-secondary)", fontSize: 11 }} />
                      <ReferenceLine x={BRS_LOW} stroke="var(--baseline)" strokeDasharray="4 3" />
                      <ReferenceLine x={BRS_HIGH} stroke="var(--baseline)" strokeDasharray="4 3" />
                      <ReferenceLine y={OLBI_MID} stroke="var(--baseline)" strokeDasharray="4 3" />
                      <XAxis
                        type="number" dataKey="resilience" name="Resiliencia (BRS)" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} allowDataOverflow
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--baseline)"
                        label={{ value: "Resiliencia (BRS, 1 a 5) → más resiliente", position: "insideBottom", offset: -14, fill: "var(--text-secondary)", fontSize: 11 }}
                      />
                      <YAxis
                        type="number" dataKey="disengagement" name="Disengagement (OLBI)" domain={[1, 4]} ticks={[1, 1.5, 2, 2.5, 3, 3.5, 4]} reversed allowDataOverflow width={44}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--baseline)"
                        label={{ value: "Disengagement (OLBI, 1 a 4) ↑ menos", angle: -90, position: "insideLeft", offset: 4, fill: "var(--text-secondary)", fontSize: 11, style: { textAnchor: "middle" } }}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "var(--baseline)" }} isAnimationActive={false} />
                      {/* Contexto (otras startups) primero, para que quede debajo. */}
                      {[...series].sort((a, b) => Number(isDim(b.point.startupId)) - Number(isDim(a.point.startupId))).map((s) => {
                        const st = isDim(s.point.startupId) ? OTHER : styleOf(s.point.startupId);
                        const dim = isDim(s.point.startupId);
                        const data: Datum[] = s.pts.map((p) => ({
                          ...p, name: s.point.fullName, startup: s.point.startupName, color: st.color, shape: st.shape, dim, mode,
                          pre: s.point.pre, post: s.point.post,
                        }));
                        return (
                          <Scatter
                            key={`${mode}-${s.point.personId}`}
                            data={data}
                            isAnimationActive={false}
                            line={mode === "delta" ? { stroke: st.color, strokeWidth: dim ? 1 : 2, strokeOpacity: dim ? 0.35 : 0.85 } : false}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            shape={(props: any) => {
                              const d = props.payload as Datum;
                              if (!d || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) return <g />;
                              return (
                                <Mark
                                  x={props.cx} y={props.cy} shape={d.shape} color={d.color} r={radius(d.exhaustion)}
                                  filled={!(d.mode === "delta" && d.kind === "pre")} opacity={d.dim ? 0.4 : 1}
                                />
                              );
                            }}
                          />
                        );
                      })}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)]" aria-label="Leyenda: startups">
                {legend.map(([sid, name]) => {
                  const st = styleOf(sid);
                  return (
                    <li key={sid} className="flex items-center gap-1.5">
                      <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden><Mark x={0} y={0} shape={st.shape} color={st.color} r={5} /></svg>
                      {name}
                    </li>
                  );
                })}
                {selectedId !== null && (
                  <li className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden><Mark x={0} y={0} shape="circleOther" color="var(--series-other)" r={5} opacity={0.5} /></svg>
                    Resto de startups (contexto)
                  </li>
                )}
                {mode === "delta" && (
                  <li className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden><Mark x={0} y={0} shape="circleOther" color="var(--text-secondary)" r={4.5} filled={false} /></svg>
                    hueco = pre
                    <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden><Mark x={0} y={0} shape="circleOther" color="var(--text-secondary)" r={4.5} /></svg>
                    lleno = post (unidos por una línea)
                  </li>
                )}
              </ul>
              <p className="text-xs text-[var(--text-muted)]">
                Líneas de referencia: BRS 3,0 y 4,3 (cortes habituales: &lt; 3,0 baja, 3,0 a 4,3 normal, &gt; 4,3 alta) y Disengagement 2,5 (punto medio de la escala 1 a 4; no hay cortes clínicos estándar en OLBI).
                {mode === "delta" ? " En Pre → Post solo aparecen founders con las dos tomas completas." : ""}
              </p>

              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-medium text-[var(--text-secondary)]">Ver datos en tabla</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <caption className="sr-only">Resiliencia, Disengagement y Exhaustion por founder</caption>
                    <thead>
                      <tr className="text-left text-[var(--text-muted)]">
                        <th scope="col" className="py-1 font-medium">Founder</th>
                        <th scope="col" className="py-1 font-medium">Startup</th>
                        <th scope="col" className="py-1 font-medium">Toma</th>
                        <th scope="col" className="py-1 text-right font-medium">BRS</th>
                        <th scope="col" className="py-1 text-right font-medium">Disengagement</th>
                        <th scope="col" className="py-1 text-right font-medium">Exhaustion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {series.flatMap((s) =>
                        s.pts.map((p) => (
                          <tr key={`${s.point.personId}-${p.kind}`} className={isDim(s.point.startupId) ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                            <th scope="row" className="py-1 text-left font-normal">{s.point.fullName}</th>
                            <td className="py-1">{s.point.startupName}</td>
                            <td className="py-1">{p.kind === "pre" ? "Pre" : "Post"}</td>
                            <td className="py-1 text-right">{fmt(p.resilience, 2)}</td>
                            <td className="py-1 text-right">{fmt(p.disengagement, 2)}</td>
                            <td className="py-1 text-right">{fmt(p.exhaustion, 2)}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </div>
      )}
    </ChartCard>
  );
}
