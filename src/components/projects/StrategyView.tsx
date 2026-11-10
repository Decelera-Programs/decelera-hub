"use client";

import { useState } from "react";
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  byProjectPriority,
  strategicAccent,
  taskProgress,
  type Project,
  type StrategicPriority,
} from "@/lib/projects";
import { OwnerAvatar } from "./ProjectCard";

const NO_PRIORITY = "__none__";

/**
 * Árbol estratégico: arriba las prioridades del año, debajo sus proyectos (ordenados por la
 * prioridad del proyecto, alta → baja) y, plegadas, las tareas de cada proyecto. Un proyecto
 * ligado a dos prioridades aparece bajo ambas, marcado como el mismo.
 */
export function StrategyView({
  priorities,
  projects,
  onOpen,
  onToggleTask,
}: {
  priorities: StrategicPriority[];
  projects: Project[];
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
}) {
  const active = priorities.filter((p) => p.isActive);
  // Año a mostrar: el más reciente con prioridades activas.
  const year = active.length ? Math.max(...active.map((p) => p.year)) : null;
  const columns = active.filter((p) => p.year === year).sort((a, b) => a.position - b.position);
  const future = priorities.filter((p) => !p.isActive);
  const byId = new Map(priorities.map((p) => [p.id, p]));

  const colIds = new Set(columns.map((c) => c.id));
  const orphans = projects.filter((p) => !p.priorityIds.some((id) => colIds.has(id))).sort(byProjectPriority);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pb-3 pt-4">
      <div className="flex min-w-max flex-1 items-start gap-4">
        {columns.map((pr) => (
          <Branch
            key={pr.id}
            title={pr.shortName || pr.title}
            accent={strategicAccent(pr.position)}
            priority={pr}
            projects={projects.filter((p) => p.priorityIds.includes(pr.id)).sort(byProjectPriority)}
            thisId={pr.id}
            byId={byId}
            onOpen={onOpen}
            onToggleTask={onToggleTask}
          />
        ))}
        {orphans.length > 0 && (
          <Branch
            key={NO_PRIORITY}
            title="Sin prioridad estratégica"
            accent="var(--text-muted)"
            projects={orphans}
            thisId={NO_PRIORITY}
            byId={byId}
            onOpen={onOpen}
            onToggleTask={onToggleTask}
          />
        )}
      </div>

      {future.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
          <span className="font-semibold uppercase tracking-wide">Future Horizon · fuera de alcance</span>
          {future.map((f) => (
            <span
              key={f.id}
              title={f.context}
              className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5"
            >
              {f.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Branch({
  title,
  accent,
  priority,
  projects,
  thisId,
  byId,
  onOpen,
  onToggleTask,
}: {
  title: string;
  accent: string;
  priority?: StrategicPriority;
  projects: Project[];
  thisId: string;
  byId: Map<string, StrategicPriority>;
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
}) {
  const [detail, setDetail] = useState(false);
  const total = projects.reduce((n, p) => n + p.tasks.length, 0);
  const done = projects.reduce((n, p) => n + p.tasks.filter((t) => t.done).length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="flex w-[300px] shrink-0 flex-col">
      {/* Nodo raíz: la prioridad */}
      <div
        className="card flex flex-col gap-2 p-3"
        style={{ borderColor: `color-mix(in srgb, ${accent} 55%, var(--border))` }}
      >
        <div className="flex items-start gap-2">
          <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
              {title}
            </div>
            {priority && (
              <div className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                {priority.title}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--pill-neutral-bg)]">
            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span>
              {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
            </span>
            <span className="tabular-nums">
              {done}/{total} tareas
            </span>
          </div>
        </div>

        {priority && (priority.context || priority.successMetrics) && (
          <>
            <button
              type="button"
              onClick={() => setDetail((v) => !v)}
              className="self-start text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {detail ? "▾ Ocultar detalle" : "▸ Contexto y KPIs"}
            </button>
            {detail && (
              <div className="flex flex-col gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {priority.context && <p>{priority.context}</p>}
                {priority.successMetrics && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      Success metrics
                    </div>
                    <p className="whitespace-pre-line">{priority.successMetrics}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Rama: raíl vertical con un nodo por proyecto */}
      <div className="ml-4 flex flex-col gap-3 border-l-2 pb-1 pl-4 pt-3" style={{ borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` }}>
        {projects.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">Ningún proyecto enlazado todavía.</p>
        )}
        {projects.map((p) => (
          <ProjectNode
            key={p.id}
            project={p}
            accent={accent}
            others={p.priorityIds.filter((id) => id !== thisId).map((id) => byId.get(id)).filter(Boolean) as StrategicPriority[]}
            onOpen={onOpen}
            onToggleTask={onToggleTask}
          />
        ))}
      </div>
    </section>
  );
}

function ProjectNode({
  project,
  accent,
  others,
  onOpen,
  onToggleTask,
}: {
  project: Project;
  accent: string;
  others: StrategicPriority[];
  onOpen: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const prog = taskProgress(project.tasks);

  return (
    <div className="relative">
      {/* Conector horizontal hacia el raíl */}
      <span
        aria-hidden
        className="absolute -left-4 top-5 h-0.5 w-4"
        style={{ background: `color-mix(in srgb, ${accent} 45%, transparent)` }}
      />
      <div className="card flex flex-col gap-1.5 p-2.5">
        <button type="button" onClick={() => onOpen(project.id)} className="flex flex-col gap-1.5 text-left">
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
          <span className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{project.title}</span>
        </button>

        {others.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
            <span aria-hidden>⛓ también en</span>
            {others.map((o) => {
              const c = strategicAccent(o.position);
              return (
                <span key={o.id} className="rounded px-1 py-0.5" style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>
                  {o.shortName || o.title}
                </span>
              );
            })}
          </div>
        )}

        {prog && (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <span aria-hidden>{open ? "▾" : "▸"}</span>
              <span className="tabular-nums">
                {prog.done}/{prog.total} tareas
              </span>
            </button>
            {open && (
              <ul className="flex flex-col gap-0.5 border-l border-[var(--border)] pl-2">
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
    </div>
  );
}
