import { AGENT_FLOWS, type FlowNode } from "@/lib/agents";

const CELL_W = 190;
const CELL_H = 108;
const NODE_W = 160;
const NODE_H = 68;
const PAD = 24;

function center(n: FlowNode) {
  return {
    x: PAD + n.col * CELL_W + NODE_W / 2,
    y: PAD + n.row * CELL_H + NODE_H / 2,
  };
}

/**
 * Diagrama de flujo de forma fija (Opción A, 2026-11-03: ver el hilo de decisión en el canal — se
 * descartó animar cada ejecución en vivo porque dura 30-60s y ocurre cada 5 min o 2 veces al día, nadie
 * se queda mirando eso correr). Los nodos/aristas se definen a mano en src/lib/agents.ts a partir del
 * SKILL.md de cada agente; aquí solo se posicionan y se anotan con el recuento real de la ventana
 * recibida en `counts` (ver getEventCountsSince). "Dale cariño más adelante" (operador, 2026-11-03):
 * candidatos obvios para una v2 son resaltar el camino de una ejecución concreta al hacer click en el
 * feed de actividad, y animar las líneas en vez de un SVG estático.
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
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Flujo — {label}</h3>
        <span className="text-xs text-[var(--text-muted)]">Últimos 7 días</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width, height, minWidth: width }}>
          <svg width={width} height={height} className="absolute inset-0" aria-hidden>
            {flow.edges.map((e) => {
              const a = center(byId[e.from]);
              const b = center(byId[e.to]);
              const midX = (a.x + b.x) / 2;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M ${a.x + NODE_W / 2} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - NODE_W / 2} ${b.y}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={2}
                />
              );
            })}
          </svg>
          {flow.nodes.map((n) => {
            const c = center(n);
            const count = nodeCount(n);
            const isEntry = flow.edges.every((e) => e.to !== n.id);
            return (
              <div
                key={n.id}
                className="absolute flex flex-col items-center justify-center gap-1 rounded-2xl border px-3 text-center shadow-sm"
                style={{
                  left: c.x - NODE_W / 2,
                  top: c.y - NODE_H / 2,
                  width: NODE_W,
                  height: NODE_H,
                  background: count > 0 ? "var(--surface-1)" : "color-mix(in srgb, var(--surface-1) 55%, transparent)",
                  borderColor:
                    count > 0 ? "color-mix(in srgb, var(--brand-water) 45%, var(--border))" : "var(--border)",
                }}
              >
                <span className="text-xs leading-tight text-[var(--text-primary)]">{n.label}</span>
                {n.eventTypes.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{
                      background: count > 0 ? "var(--pill-good-bg)" : "var(--pill-neutral-bg)",
                      color: count > 0 ? "var(--status-good)" : "var(--text-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
                {isEntry && <span className="text-[10px] text-[var(--text-muted)]">entrada</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
