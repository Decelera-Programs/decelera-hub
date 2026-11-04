import { AGENT_FLOWS, type FlowNode, type FlowTone } from "@/lib/agents";

const CELL_W = 200;
const CELL_H = 116;
const NODE_W = 168;
const NODE_H = 76;
const PAD = 28;

const TONE_ACCENT: Record<FlowTone, string> = {
  neutral: "var(--text-muted)",
  info: "var(--brand-water)",
  warning: "var(--status-warning)",
  progress: "var(--brand-sea)",
  success: "var(--status-good)",
  critical: "var(--status-critical)",
};

function center(n: FlowNode) {
  return {
    x: PAD + n.col * CELL_W + NODE_W / 2,
    y: PAD + n.row * CELL_H + NODE_H / 2,
  };
}

/**
 * Diagrama de flujo de forma fija (Opción A, 2026-11-03 — ver [[project-inbound-follow-up-build]]). Los
 * nodos/aristas se definen a mano en src/lib/agents.ts; aquí solo se posicionan y se anotan con el
 * recuento real de `counts`. Restyled dos veces el mismo día: primero para parecerse a las tarjetas de
 * Herramientas (halo de color + icono grande), luego calmado ("el degradado es un poco feo, menos
 * cantoso... menos emojis y alguna animación") — ahora: una textura de puntos muy tenue de fondo (misma
 * técnica que `.dot-grid`, pero en tono claro para encajar sobre `--surface-1` en vez del original para
 * fondos oscuros), un solo icono pequeño en una píldora circular, una barra de acento de 3px arriba en
 * vez de un degradado radial, y el trazo de las aristas activas fluye con `.flow-edge-animated` en lugar
 * de mostrar solo un color estático.
 */
export function FlowDiagram({
  agentId,
  label,
  counts,
}: {
  agentId: string;
  label: string;
  counts: Record<string, number>;
}) {
  const flow = AGENT_FLOWS[agentId];
  if (!flow) return null;

  const maxCol = Math.max(...flow.nodes.map((n) => n.col));
  const maxRow = Math.max(...flow.nodes.map((n) => n.row));
  const width = PAD * 2 + (maxCol + 1) * CELL_W;
  const height = PAD * 2 + (maxRow + 1) * CELL_H;
  const byId = Object.fromEntries(flow.nodes.map((n) => [n.id, n]));

  function nodeCount(n: FlowNode): number {
    return n.eventTypes.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
  }

  return (
    <div className="card spotlight flex w-full min-w-0 max-w-full shrink-0 flex-col gap-3 overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Flujo — {label}</h3>
        <span className="text-xs text-[var(--text-muted)]">Últimos 7 días</span>
      </div>
      <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl pb-2 [-webkit-overflow-scrolling:touch]">
        <div
          className="relative shrink-0 rounded-2xl"
          style={{
            width,
            height,
            minWidth: width,
            backgroundImage: "radial-gradient(color-mix(in srgb, var(--text-primary) 10%, transparent) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <svg width={width} height={height} className="absolute inset-0" aria-hidden>
            {flow.edges.map((e) => {
              const from = byId[e.from];
              const to = byId[e.to];
              const a = center(from);
              const b = center(to);
              const midX = (a.x + b.x) / 2;
              const active = nodeCount(from) > 0 && (to.eventTypes.length === 0 || nodeCount(to) > 0);
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  className={active ? "flow-edge-animated" : undefined}
                  d={`M ${a.x + NODE_W / 2} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - NODE_W / 2} ${b.y}`}
                  fill="none"
                  stroke={active ? TONE_ACCENT[to.tone] : "var(--border)"}
                  strokeWidth={active ? 2 : 1.5}
                  strokeLinecap="round"
                  opacity={active ? 0.75 : 0.5}
                />
              );
            })}
          </svg>
          {flow.nodes.map((n) => {
            const c = center(n);
            const count = nodeCount(n);
            const isEntry = flow.edges.every((e) => e.to !== n.id);
            const active = count > 0 || (isEntry && n.eventTypes.length === 0);
            const accent = TONE_ACCENT[n.tone];
            return (
              <div
                key={n.id}
                className="absolute flex flex-col items-center justify-center gap-1 rounded-2xl border bg-[var(--surface-1)] px-3 text-center shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  left: c.x - NODE_W / 2,
                  top: c.y - NODE_H / 2,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: active ? `color-mix(in srgb, ${accent} 40%, var(--border))` : "var(--border)",
                  boxShadow: active ? `0 8px 20px -16px color-mix(in srgb, ${accent} 50%, transparent)` : undefined,
                }}
              >
                {/* Barra de acento SIEMPRE en el flujo normal (no absolute) — así nunca se solapa con el
                    icono aunque la etiqueta ocupe dos líneas y empuje el bloque hacia arriba. Se reserva
                    su altura siempre (visible solo si active) para que no haya salto de layout. */}
                <span
                  aria-hidden
                  className="h-[3px] w-10 shrink-0 rounded-full"
                  style={{ background: active ? accent : "transparent", opacity: active ? 0.8 : 0 }}
                />
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm leading-none"
                  style={{
                    background: active ? `color-mix(in srgb, ${accent} 16%, transparent)` : "var(--pill-neutral-bg)",
                  }}
                >
                  {n.icon}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-[var(--text-primary)]">{n.label}</span>
                {n.eventTypes.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{
                      background: count > 0 ? `color-mix(in srgb, ${accent} 18%, transparent)` : "var(--pill-neutral-bg)",
                      color: count > 0 ? accent : "var(--text-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
