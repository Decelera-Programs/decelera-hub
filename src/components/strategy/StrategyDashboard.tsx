"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  STATUS_COLOR,
  buildOkrTree,
  currentQuarter,
  flattenTree,
  pathTo,
  yearPosition,
  QUARTER_LABEL,
  OKR_YEAR,
  type OkrItem,
  type OkrNode,
  type OkrProject,
  type OkrStatus,
} from "@/lib/okr";
import {
  createOkrItem,
  deleteOkrItem,
  setOkrItemProjects,
  updateOkrItem,
  type OkrPatch,
} from "@/app/estrategia/actions";
import { OkrDrawer } from "./OkrDrawer";
import { ProgressBar, ProjectDots, StatusChip, ValueGoal, pct } from "./okr-ui";

const ACCENTS = ["var(--brand-sea)", "var(--brand-sun)", "var(--brand-water)", "var(--brand-cloud)"];
const DAY = 86_400_000;

export function StrategyDashboard({
  items: initialItems,
  projects,
  isAdmin,
  todayIso,
}: {
  items: OkrItem[];
  projects: OkrProject[];
  isAdmin: boolean;
  /** YYYY-MM-DD calculado en el servidor (evita desajustes de hidratación por zona horaria). */
  todayIso: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  // Tras un `router.refresh()` llegan items nuevos del servidor: se resincroniza durante el render.
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }

  const today = useMemo(() => new Date(`${todayIso}T00:00:00Z`), [todayIso]);
  const tree = useMemo(() => buildOkrTree(items, projects, today), [items, projects, today]);
  const all = useMemo(() => flattenTree(tree), [tree]);
  const quarter = currentQuarter(today);

  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const objective = tree.find((o) => o.item.id === objectiveId) ?? tree[0] ?? null;
  const opened = openId ? (all.find((n) => n.item.id === openId) ?? null) : null;

  // --- Escrituras optimistas (igual que /proyectos): se aplica en local y, si falla, se resincroniza. ---
  const run = useCallback(
    (fn: () => Promise<unknown>) => {
      fn().catch(() => router.refresh());
    },
    [router],
  );

  const patchItem = useCallback(
    (id: string, patch: OkrPatch) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      run(() => updateOkrItem(id, patch));
    },
    [run],
  );

  const setProjects = useCallback(
    (id: string, projectIds: string[]) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, projectIds } : it)));
      run(() => setOkrItemProjects(id, projectIds));
    },
    [run],
  );

  const addItem = useCallback(
    async (parentId: string | null) => {
      try {
        const created = await createOkrItem(parentId);
        setItems((prev) => [...prev, created]);
        if (parentId) setExpanded((s) => new Set(s).add(parentId));
        setOpenId(created.id);
      } catch {
        router.refresh();
      }
    },
    [router],
  );

  const removeItem = useCallback(
    (id: string) => {
      const n = all.find((x) => x.item.id === id);
      const count = n ? flattenTree([n]).length : 1;
      const msg =
        count > 1
          ? `Se eliminará "${n!.item.title}" y las ${count - 1} filas que cuelgan de él. ¿Seguro?`
          : `Se eliminará "${n?.item.title ?? "este elemento"}". ¿Seguro?`;
      if (!window.confirm(msg)) return;
      const gone = new Set(n ? flattenTree([n]).map((x) => x.item.id) : [id]);
      setItems((prev) => prev.filter((it) => !gone.has(it.id)));
      setOpenId(null);
      run(() => deleteOkrItem(id));
    },
    [all, run],
  );

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Resumen global: cuántos objetivos hay en cada estado.
  const counts = useMemo(() => {
    const c = new Map<OkrStatus, number>();
    for (const o of tree) c.set(o.status, (c.get(o.status) ?? 0) + 1);
    return c;
  }, [tree]);
  const blockedTotal = useMemo(() => {
    const ids = new Set<string>();
    for (const o of tree) o.projects.filter((p) => p.health === "blocked").forEach((p) => ids.add(p.id));
    return ids.size;
  }, [tree]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Título + línea del año */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="page-title text-2xl tracking-tight text-[var(--text-primary)] sm:text-3xl">Estrategia {OKR_YEAR}</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Cómo avanzan los objetivos de la empresa, sostenidos por lo que medimos y por los proyectos que los mueven.
            </p>
          </div>
          <YearLine today={today} />
        </div>

        {/* Resumen en una línea */}
        {tree.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
            {(["off_track", "at_risk", "on_track", "done", "pending", "none"] as OkrStatus[])
              .filter((s) => counts.get(s))
              .map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  <strong className="tabular-nums text-[var(--text-primary)]">{counts.get(s)}</strong>{" "}
                  {counts.get(s) === 1 ? "objetivo" : "objetivos"} · {statusWord(s)}
                </span>
              ))}
            {blockedTotal > 0 && (
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--status-critical)" }}>
                ⚠ {blockedTotal} {blockedTotal === 1 ? "proyecto bloqueado" : "proyectos bloqueados"} frenan objetivos
              </span>
            )}
          </div>
        )}

        {/* Objetivos */}
        {tree.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--text-secondary)]">
            Todavía no hay OKR cargados.
            {isAdmin && (
              <div className="mt-4">
                <button type="button" onClick={() => addItem(null)} className="rounded-full bg-[var(--brand-sea)] px-4 py-2 text-xs font-semibold text-white">
                  + Crear el primer objetivo
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {tree.map((o, i) => (
                <ObjectiveCard
                  key={o.item.id}
                  node={o}
                  accent={ACCENTS[i % ACCENTS.length]}
                  selected={objective?.item.id === o.item.id}
                  onSelect={() => setObjectiveId(o.item.id)}
                  onOpen={() => {
                    setObjectiveId(o.item.id);
                    setOpenId(o.item.id);
                  }}
                />
              ))}
              {isAdmin && tree.length < 6 && (
                <button
                  type="button"
                  onClick={() => addItem(null)}
                  className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-sea)] hover:text-[var(--brand-sea)]"
                >
                  + Objetivo
                </button>
              )}
            </div>

            {/* Árbol del objetivo elegido */}
            {objective && (
              <section aria-label={`KRs del objetivo ${objective.item.code}`}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Objetivo {objective.item.code} · key results e iniciativas
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((s) => (objective.children.every((k) => s.has(k.item.id)) ? new Set() : new Set(objective.children.map((k) => k.item.id))))
                    }
                    className="text-xs font-semibold text-[var(--brand-sea)] hover:underline"
                  >
                    {objective.children.every((k) => expanded.has(k.item.id)) ? "Contraer todo" : "Expandir todo"}
                  </button>
                </div>

                <div className="card overflow-hidden">
                  <div className="hidden grid-cols-[minmax(0,1fr)_110px_170px_150px_120px_64px] items-center gap-3 border-b border-[var(--border)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] md:grid">
                    <span>Qué medimos</span>
                    <span>Responsable</span>
                    <span>Avance · marca = hoy</span>
                    <span>Ahora → meta</span>
                    <span>Estado</span>
                    <span>Proyectos</span>
                  </div>
                  {objective.children.length === 0 && (
                    <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Este objetivo aún no tiene key results.</p>
                  )}
                  {objective.children.map((kr, idx) => {
                    const prev = objective.children[idx - 1];
                    const showGroup = kr.item.group && kr.item.group !== prev?.item.group;
                    const isOpen = expanded.has(kr.item.id);
                    return (
                      <div key={kr.item.id}>
                        {showGroup && (
                          <p className="border-t border-[var(--border)] bg-[var(--row-alt)] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {kr.item.group}
                          </p>
                        )}
                        <Row node={kr} depth={0} expanded={isOpen} onToggle={() => toggle(kr.item.id)} onOpen={() => setOpenId(kr.item.id)} active={openId === kr.item.id} />
                        {isOpen &&
                          kr.children.map((ini) => (
                            <Row key={ini.item.id} node={ini} depth={1} onOpen={() => setOpenId(ini.item.id)} active={openId === ini.item.id} />
                          ))}
                      </div>
                    );
                  })}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => addItem(objective.item.id)}
                      className="w-full border-t border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--brand-sea)]"
                    >
                      + Añadir KR
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {opened && (
        <OkrDrawer
          key={opened.item.id}
          node={opened}
          path={pathTo(tree, opened.item.id)}
          projects={projects}
          isAdmin={isAdmin}
          currentQuarter={quarter}
          onClose={() => setOpenId(null)}
          onOpen={setOpenId}
          onPatch={patchItem}
          onSetProjects={setProjects}
          onAdd={addItem}
          onDelete={removeItem}
        />
      )}
    </div>
  );
}

function statusWord(s: OkrStatus): string {
  return { done: "cumplidos", on_track: "en ritmo", at_risk: "en riesgo", off_track: "fuera de ritmo", pending: "aún no tocan", none: "sin medir" }[s];
}

/** Año en cuatro tramos con un marcador en "hoy": de un vistazo, cuánto del año ha pasado. */
function YearLine({ today }: { today: Date }) {
  const pos = yearPosition(today);
  const start = Date.UTC(OKR_YEAR, 0, 1);
  const daysTo = Math.ceil((start - today.getTime()) / DAY);
  const label =
    pos <= 0
      ? `Faltan ${daysTo} días para el 1 de enero`
      : pos >= 4
        ? "Año cerrado"
        : `Estamos en ${QUARTER_LABEL[Math.min(3, Math.floor(pos))]}`;
  return (
    <div className="w-full max-w-xs" aria-label={label}>
      <div className="relative">
        <div className="grid grid-cols-4 gap-1">
          {QUARTER_LABEL.map((q, i) => (
            <div key={q} className="h-1.5 rounded-full" style={{ background: pos > i ? "var(--brand-sea)" : "color-mix(in srgb, var(--text-muted) 22%, transparent)", opacity: pos > i ? (pos >= i + 1 ? 1 : 0.5) : 1 }} />
          ))}
        </div>
        {pos > 0 && pos < 4 && (
          <span aria-hidden className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-[var(--text-primary)]" style={{ left: `${(pos / 4) * 100}%` }} />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-[var(--text-muted)]">
        {QUARTER_LABEL.map((q) => (
          <span key={q}>{q}</span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function ObjectiveCard({
  node,
  accent,
  selected,
  onSelect,
  onOpen,
}: {
  node: OkrNode;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const { item } = node;
  const krs = node.children.length;
  const inis = node.children.reduce((n, k) => n + k.children.length, 0);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="card hub-reveal group flex cursor-pointer flex-col gap-4 p-5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5"
      style={{
        borderColor: selected ? accent : undefined,
        boxShadow: selected ? `0 0 0 1px ${accent}, 0 16px 32px -20px ${accent}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: `color-mix(in srgb, ${accent} 22%, transparent)`, color: "var(--text-primary)" }}
        >
          Objetivo {item.code}
        </span>
        <StatusChip status={node.status} small />
      </div>

      <h3 className="line-clamp-3 min-h-[3.9em] text-[14px] font-semibold leading-snug text-[var(--text-primary)]">{item.title}</h3>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">{pct(node.progress)}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            <ValueGoal node={node} />
          </span>
        </div>
        <ProgressBar progress={node.progress} expected={node.expected} status={node.status} height={8} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-secondary)]">
        <span>
          {krs} KRs · {inis} iniciativas
          {item.owner && <> · {item.owner}</>}
        </span>
        <span className="flex items-center gap-2">
          {node.blocked > 0 && (
            <span className="font-semibold" style={{ color: "var(--status-critical)" }} title="Proyectos bloqueados">
              ⚠ {node.blocked}
            </span>
          )}
          <ProjectDots projects={node.projects} emptyText="sin proyectos" />
        </span>
      </div>
    </div>
  );
}

function Row({
  node,
  depth,
  expanded,
  onToggle,
  onOpen,
  active,
}: {
  node: OkrNode;
  depth: 0 | 1;
  expanded?: boolean;
  onToggle?: () => void;
  onOpen: () => void;
  active: boolean;
}) {
  const { item } = node;
  const hasKids = depth === 0 && node.children.length > 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-[var(--border)] px-4 py-2.5 transition-colors hover:bg-[var(--row-hover)] md:grid-cols-[minmax(0,1fr)_110px_170px_150px_120px_64px]"
      style={{ background: active ? "var(--row-hover)" : depth === 1 ? "var(--row-alt)" : undefined }}
    >
      <div className="flex min-w-0 items-start gap-2" style={{ paddingLeft: depth * 22 }}>
        {hasKids ? (
          <button
            type="button"
            aria-label={expanded ? "Contraer" : "Expandir"}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)]"
          >
            <span aria-hidden className="text-[10px] transition-transform" style={{ transform: expanded ? "rotate(90deg)" : undefined }}>
              ▶
            </span>
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <span className="mt-0.5 w-9 shrink-0 text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">{item.code}</span>
        <span className={`min-w-0 text-[13px] leading-snug text-[var(--text-primary)] ${depth === 0 ? "font-semibold" : ""}`}>
          {item.title}
          {hasKids && !expanded && (
            <span className="ml-2 text-[11px] font-normal text-[var(--text-muted)]">{node.children.length} iniciativas</span>
          )}
        </span>
      </div>

      <span className="hidden truncate text-xs text-[var(--text-secondary)] md:block">{item.owner}</span>

      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
        <ProgressBar progress={node.progress} expected={node.expected} status={node.status} />
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--text-primary)]">{pct(node.progress)}</span>
      </div>

      <span className="hidden text-xs md:block">
        <ValueGoal node={node} />
      </span>
      <span className="hidden md:block">
        <StatusChip status={node.status} small />
      </span>
      <span className="hidden items-center gap-1 md:flex">
        {node.blocked > 0 && (
          <span className="text-[11px] font-bold" style={{ color: "var(--status-critical)" }}>
            ⚠
          </span>
        )}
        <ProjectDots projects={node.projects} max={4} />
      </span>
    </div>
  );
}
