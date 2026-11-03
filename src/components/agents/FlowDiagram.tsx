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
 * nodos/aristas se definen a mano en src/lib/agents.ts a partir del SKILL.md de cada agente; aquí solo se
 * posicionan y se anotan con el recuento real de la ventana recibida en `counts`. Restyled 2026-11-03
 * (operator: "mira en herramientas... algo no tan minimalista, más moderno, como una startup de ai") para
 * usar el mismo lenguaje visual que las tarjetas de Herramientas (DriveView's FileTile): halo radial
 * teñido por categoría, glow en el borde cuando hay actividad, icono grande. Candidatos obvios para una v2
 * (no construidos): resaltar el camino de una ejecución concreta al hacer click en el feed de actividad,
 * animar el flujo de las líneas en vez de un gradiente estático.
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
    <div className="card spotlight flex flex-col gap-3 overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Flujo — {label}</h3>
        <span className="text-xs text-[var(--text-muted)]">Últimos 7 días</span>
      </div>
      <div className="overflow-x-auto rounded-2xl">
        <div
          className="relative rounded-2xl"
          style={{
            width,
            height,
            minWidth: width,
            background:
              "radial-gradient(60% 70% at 10% 0%, color-mix(in srgb, var(--brand-water) 7%, transparent), transparent 70%), " +
              "radial-gradient(50% 60% at 90% 100%, color-mix(in srgb, var(--brand-sun) 6%, transparent), transparent 70%)",
          }}
        >
          <svg width={width} height={height} className="absolute inset-0" aria-hidden>
            <defs>
              <linearGradient id="flow-edge-idle" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--border)" />
                <stop offset="100%" stopColor="var(--border)" />
              </linearGradient>
              <linearGradient id="flow-edge-active" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--brand-water)" />
                <stop offset="100%" stopColor="var(--brand-sea)" />
              </linearGradient>
            </defs>
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
                  d={`M ${a.x + NODE_W / 2} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - NODE_W / 2} ${b.y}`}
                  fill="none"
                  stroke={active ? "url(#flow-edge-active)" : "url(#flow-edge-idle)"}
                  strokeWidth={active ? 2.5 : 2}
                  strokeLinecap="round"
                  opacity={active ? 0.9 : 0.5}
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
                className="group absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border px-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  left: c.x - NODE_W / 2,
                  top: c.y - NODE_H / 2,
                  width: NODE_W,
                  height: NODE_H,
                  background: active
                    ? `radial-gradient(85% 130% at 50% -10%, color-mix(in srgb, ${accent} 22%, transparent), var(--surface-1) 70%)`
                    : "color-mix(in srgb, var(--surface-1) 45%, transparent)",
                  borderColor: active ? `color-mix(in srgb, ${accent} 45%, var(--border))` : "var(--border)",
                  boxShadow: active ? `0 10px 28px -16px color-mix(in srgb, ${accent} 55%, transparent)` : undefined,
                }}
              >
                <span
                  className="absolute -right-3 -top-3 text-3xl opacity-[0.12] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6"
                  aria-hidden
                >
                  {n.icon}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold leading-tight text-[var(--text-primary)]">
                  <span aria-hidden>{n.icon}</span>
                  {n.label}
                </span>
                {n.eventTypes.length > 0 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{
                      background: count > 0 ? `color-mix(in srgb, ${accent} 18%, transparent)` : "var(--pill-neutral-bg)",
                      color: count > 0 ? accent : "var(--text-muted)",
                    }}
                  >
                    {count}
                  </span>
                ) : (
                  isEntry && (
                    <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
