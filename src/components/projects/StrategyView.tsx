"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  byProjectPriority,
  strategicAccent,
  strategicInk,
  taskProgress,
  type Project,
  type StrategicPriority,
} from "@/lib/projects";
import { OwnerAvatar } from "./ProjectCard";

/* ---------- Tipos de nodo ---------- */

type PriorityData = {
  priority: StrategicPriority;
  accent: string;
  ink: string;
  projects: number;
  done: number;
  total: number;
};
type ProjectData = {
  project: Project;
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
};
type PriorityNode = Node<PriorityData, "priority">;
type ProjectNode = Node<ProjectData, "project">;
type AppNode = PriorityNode | ProjectNode;
type LinkData = { accent: string; onUnlink: () => void };
type LinkEdge = Edge<LinkData, "link">;

const PR = "pr:";
const PJ = "pj:";
const LANE = 270; // separación horizontal entre carriles
const ROW = 170; // separación vertical entre proyectos de un mismo carril
const PROJECT_TOP = 200;
const POS_KEY = "hub:estrategia:pos";

type Pos = Record<string, { x: number; y: number }>;

function loadPos(): Pos {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? "{}") as Pos;
  } catch {
    return {};
  }
}
function savePos(p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    // sin persistencia
  }
}

/**
 * Colocación automática: cada prioridad ocupa un carril; un proyecto compartido se sitúa en el
 * carril medio de sus prioridades (entre ambas) y los huérfanos en un carril propio a la derecha.
 */
function defaultLayout(columns: StrategicPriority[], projects: Project[]): Pos {
  const pos: Pos = {};
  const laneOf = new Map(columns.map((c, i) => [c.id, i * 2]));
  columns.forEach((c, i) => (pos[PR + c.id] = { x: i * 2 * LANE, y: 0 }));
  const orphanLane = Math.max(columns.length * 2, 1);
  const used = new Map<number, number>();
  for (const p of [...projects].sort(byProjectPriority)) {
    const lanes = p.priorityIds.map((id) => laneOf.get(id)).filter((l): l is number => l !== undefined);
    const lane = lanes.length ? Math.round(lanes.reduce((a, b) => a + b, 0) / lanes.length) : orphanLane;
    const n = used.get(lane) ?? 0;
    used.set(lane, n + 1);
    pos[PJ + p.id] = { x: lane * LANE, y: PROJECT_TOP + n * ROW };
  }
  return pos;
}

function buildNodes(
  columns: StrategicPriority[],
  projects: Project[],
  saved: Pos,
  handlers: Pick<ProjectData, "onOpen" | "onToggleTask">,
): AppNode[] {
  const base = defaultLayout(columns, projects);
  const nodes: AppNode[] = [];
  for (const c of columns) {
    const linked = projects.filter((p) => p.priorityIds.includes(c.id));
    nodes.push({
      id: PR + c.id,
      type: "priority",
      position: saved[PR + c.id] ?? base[PR + c.id],
      data: {
        priority: c,
        accent: strategicAccent(c.position),
        ink: strategicInk(c.position),
        projects: linked.length,
        done: linked.reduce((n, p) => n + p.tasks.filter((t) => t.done).length, 0),
        total: linked.reduce((n, p) => n + p.tasks.length, 0),
      },
    });
  }
  for (const p of projects) {
    nodes.push({
      id: PJ + p.id,
      type: "project",
      position: saved[PJ + p.id] ?? base[PJ + p.id],
      data: { project: p, ...handlers },
    });
  }
  return nodes;
}

/* ---------- Nodos ---------- */

function PriorityCard({ data, selected }: NodeProps<PriorityNode>) {
  const { priority, accent, ink, projects, done, total } = data;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="card w-[250px] cursor-grab p-3 active:cursor-grabbing"
      style={{
        borderColor: `color-mix(in srgb, ${accent} ${selected ? 90 : 55}%, var(--border))`,
        boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${accent} 22%, transparent)` : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ink }}>
            {priority.shortName || "Prioridad"}
          </div>
          <div className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{priority.title}</div>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--pill-neutral-bg)]">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[var(--text-muted)]">
        <span>
          {projects} {projects === 1 ? "proyecto" : "proyectos"}
        </span>
        <span className="tabular-nums">
          {done}/{total} tareas
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: accent, width: 12, height: 12, border: "2px solid var(--surface-1)" }}
      />
    </div>
  );
}

function ProjectCardNode({ data }: NodeProps<ProjectNode>) {
  const { project, onOpen, onToggleTask } = data;
  const [open, setOpen] = useState(false);
  const prog = taskProgress(project.tasks);
  return (
    <div className="card w-[250px] cursor-grab p-2.5 active:cursor-grabbing">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "var(--brand-water)", width: 12, height: 12, border: "2px solid var(--surface-1)" }}
      />
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: HEALTH_COLOR[project.health] }}
          title={HEALTH_LABEL[project.health]}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: PRIORITY_COLOR[project.priority] }}
        >
          {PRIORITY_LABEL[project.priority]}
        </span>
        {project.owner && (
          <span className="ml-auto">
            <OwnerAvatar owner={project.owner} size={18} />
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="nodrag mt-1 block text-left text-sm font-semibold leading-snug text-[var(--text-primary)] hover:underline"
      >
        {project.title}
      </button>
      {prog && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--pill-neutral-bg)]">
          <span
            className="block h-full rounded-full transition-[width]"
            style={{
              width: `${Math.round((prog.done / prog.total) * 100)}%`,
              background:
                prog.done === prog.total
                  ? "var(--status-good)"
                  : "linear-gradient(90deg, var(--brand-water), var(--brand-sea))",
            }}
          />
        </div>
      )}
      {prog && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="nodrag mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <span aria-hidden>{open ? "▾" : "▸"}</span>
            <span className="tabular-nums">
              {prog.done}/{prog.total} tareas
            </span>
          </button>
          {open && (
            <ul className="nodrag nowheel mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto border-l border-[var(--border)] pl-2">
              {project.tasks.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => onToggleTask(project.id, t.id, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className={t.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"}>
                      {t.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Arista: curva con color de la prioridad y "×" al seleccionarla ---------- */

function LinkEdgeView({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  id,
}: EdgeProps<LinkEdge>) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const accent = data?.accent ?? "var(--brand-water)";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={22}
        style={{ stroke: accent, strokeWidth: selected ? 3.5 : 2.25, opacity: selected ? 1 : 0.8 }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={() => data?.onUnlink()}
            title="Quitar enlace"
            className="nodrag nopan absolute grid h-5 w-5 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[11px] font-bold text-[var(--status-critical)] shadow"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, pointerEvents: "all" }}
          >
            ✕
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { priority: PriorityCard, project: ProjectCardNode };
const edgeTypes = { link: LinkEdgeView };

/* ---------- Vista ---------- */

export function StrategyView(props: {
  priorities: StrategicPriority[];
  projects: Project[];
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onSetPriorities: (projectId: string, priorityIds: string[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}

function Graph({
  priorities,
  projects,
  onOpen,
  onToggleTask,
  onSetPriorities,
}: {
  priorities: StrategicPriority[];
  projects: Project[];
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onSetPriorities: (projectId: string, priorityIds: string[]) => void;
}) {
  const { fitView } = useReactFlow();
  const active = priorities.filter((p) => p.isActive);
  const year = active.length ? Math.max(...active.map((p) => p.year)) : null;
  const columns = useMemo(
    () => active.filter((p) => p.year === year).sort((a, b) => a.position - b.position),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorities, year],
  );
  const colIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  // Posiciones guardadas por el usuario (localStorage). El estado inicial las lee una vez;
  // el ref se usa solo desde efectos y manejadores de eventos.
  const [initialSaved] = useState<Pos>(loadPos);
  const savedRef = useRef<Pos>(initialSaved);

  const handlers = useMemo(() => ({ onOpen, onToggleTask }), [onOpen, onToggleTask]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(
    buildNodes(columns, projects, initialSaved, handlers),
  );
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  // Resincroniza los datos de los nodos con las props conservando posición y medidas.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return buildNodes(columns, projects, savedRef.current, handlers).map((n) => {
        const old = prevById.get(n.id);
        return old ? ({ ...old, data: n.data } as AppNode) : n;
      });
    });
  }, [columns, projects, handlers, setNodes]);

  const link = useCallback(
    (projectId: string, priorityId: string) => {
      const p = projects.find((x) => x.id === projectId);
      if (!p || p.priorityIds.includes(priorityId)) return;
      // Un proyecto cuelga de una sola prioridad: enlazar a otra lo mueve.
      onSetPriorities(projectId, [priorityId]);
    },
    [projects, onSetPriorities],
  );

  const unlink = useCallback(
    (projectId: string, priorityId: string) => {
      const p = projects.find((x) => x.id === projectId);
      if (p) onSetPriorities(projectId, p.priorityIds.filter((id) => id !== priorityId));
    },
    [projects, onSetPriorities],
  );

  const edges: LinkEdge[] = useMemo(
    () =>
      projects.flatMap((p) =>
        p.priorityIds
          .filter((id) => colIds.has(id))
          .map((prId) => ({
            id: `${PJ}${p.id}->${PR}${prId}`,
            source: PR + prId,
            target: PJ + p.id,
            type: "link" as const,
            data: {
              accent: strategicAccent(byId.get(prId)!.position),
              onUnlink: () => unlink(p.id, prId),
            },
          })),
      ),
    [projects, colIds, byId, unlink],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      const [a, b] = [c.source, c.target];
      const pr = [a, b].find((x) => x?.startsWith(PR));
      const pj = [a, b].find((x) => x?.startsWith(PJ));
      if (pr && pj) link(pj.slice(PJ.length), pr.slice(PR.length));
    },
    [link],
  );

  const isValidConnection = useCallback(
    (c: Connection | Edge) =>
      (c.source.startsWith(PR) && c.target.startsWith(PJ)) ||
      (c.source.startsWith(PJ) && c.target.startsWith(PR)),
    [],
  );

  function resetLayout() {
    savedRef.current = {};
    savePos({});
    setNodes(buildNodes(columns, projects, {}, handlers));
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }));
  }

  const sel = selectedPriority ? byId.get(selectedPriority) : null;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
      <div className="card relative min-h-0 flex-1 overflow-hidden">
        <ReactFlow<AppNode, LinkEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          onNodeClick={(_, n) => setSelectedPriority(n.id.startsWith(PR) ? n.id.slice(PR.length) : null)}
          onPaneClick={() => setSelectedPriority(null)}
          onNodeDragStop={(_, n) => {
            savedRef.current = { ...(savedRef.current), [n.id]: n.position };
            savePos(savedRef.current);
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          connectionLineStyle={{ stroke: "var(--brand-water)", strokeWidth: 2.5 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--border)" />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            <div className="glass max-w-[260px] rounded-xl border border-[var(--border)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              Arrastra las tarjetas para organizarlas. Para enlazar un proyecto, tira desde el punto de la
              tarjeta hasta una prioridad (o al revés). Pulsa una línea para quitarla.
              <button
                type="button"
                onClick={resetLayout}
                className="mt-1 block font-semibold text-[var(--brand-sea)] hover:underline"
              >
                Reordenar automáticamente
              </button>
            </div>
          </Panel>
          {sel && (
            <Panel position="top-right">
              <div className="glass flex max-h-[70vh] w-[320px] flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{sel.title}</div>
                {sel.context && <p>{sel.context}</p>}
                {sel.whyItMatters && (
                  <Detail label="Por qué importa">{sel.whyItMatters}</Detail>
                )}
                {sel.successMetrics && <Detail label="Success metrics">{sel.successMetrics}</Detail>}
                {sel.relatedProblemSpace && <Detail label="Problem space">{sel.relatedProblemSpace}</Detail>}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <p className="whitespace-pre-line">{children}</p>
    </div>
  );
}
