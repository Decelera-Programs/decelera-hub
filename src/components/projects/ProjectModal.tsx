"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PROJECT_HEALTHS,
  type Project,
  type ProjectHealth,
  type ProjectOwner,
} from "@/lib/projects";
import { TEAMS, TEAM_LABEL, type Team } from "@/lib/teams";
import { useWorkspace } from "@/components/WorkspaceContext";

const fieldCls =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-water)]";
const labelCls = "text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";

type Tab = "info" | "docs" | "checklist";

export type ProjectFieldPatch = {
  title?: string;
  info?: string;
  health?: ProjectHealth;
  ownerId?: string | null;
  team?: Team | null;
  startDate?: string | null;
  endDate?: string | null;
};

/** Callbacks optimistas: el board actualiza su estado y lanza la escritura. */
export type ModalHandlers = {
  patch: (projectId: string, patch: ProjectFieldPatch) => void;
  addTask: (projectId: string, label: string) => void;
  toggleTask: (projectId: string, taskId: string, done: boolean) => void;
  updateTask: (projectId: string, taskId: string, label: string) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  addDoc: (projectId: string, label: string, url: string) => void;
  deleteDoc: (projectId: string, docId: string) => void;
  remove: (projectId: string) => void;
};

export function ProjectModal({
  project,
  members,
  handlers,
  onClose,
}: {
  project: Project;
  members: ProjectOwner[];
  handlers: ModalHandlers;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [title, setTitle] = useState(project.title);
  const [info, setInfo] = useState(project.info);
  const [confirmDel, setConfirmDel] = useState(false);
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoRef = useRef(project.info);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Flush del debounce de "info" al cerrar.
  useEffect(() => {
    const id = project.id;
    const original = project.info;
    return () => {
      if (infoTimer.current) clearTimeout(infoTimer.current);
      if (infoRef.current !== original) handlers.patch(id, { info: infoRef.current });
    };
  }, [project.id, project.info, handlers]);

  function onInfoChange(v: string) {
    setInfo(v);
    infoRef.current = v;
    if (infoTimer.current) clearTimeout(infoTimer.current);
    infoTimer.current = setTimeout(() => handlers.patch(project.id, { info: v }), 500);
  }
  function saveTitle() {
    if (title.trim() && title !== project.title) handlers.patch(project.id, { title });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--brand-night) 45%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="Título del proyecto"
            className="w-full bg-transparent text-lg font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />

          <div className="flex flex-wrap gap-1">
            {PROJECT_HEALTHS.map((h) => (
              <HealthPill
                key={h}
                health={h}
                active={project.health === h}
                onClick={() => handlers.patch(project.id, { health: h })}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Encargado</span>
              <select
                className={fieldCls}
                value={project.ownerId ?? ""}
                onChange={(e) => handlers.patch(project.id, { ownerId: e.target.value || null })}
              >
                <option value="">— Sin asignar —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Equipo</span>
              <select
                className={fieldCls}
                value={project.team ?? ""}
                onChange={(e) =>
                  handlers.patch(project.id, { team: (e.target.value || null) as Team | null })
                }
              >
                <option value="">— Ninguno —</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {TEAM_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Inicio</span>
              <input
                type="date"
                className={fieldCls}
                value={project.startDate ?? ""}
                onChange={(e) => handlers.patch(project.id, { startDate: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Fecha límite</span>
              <input
                type="date"
                className={fieldCls}
                value={project.endDate ?? ""}
                onChange={(e) => handlers.patch(project.id, { endDate: e.target.value || null })}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[var(--border)] px-4">
          {(["info", "docs", "checklist"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="relative px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{ color: tab === t ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {t === "info" ? "Info" : t === "docs" ? "Documentos" : "Checklist"}
              {tab === t && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--brand-water)" }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "info" && (
            <textarea
              value={info}
              onChange={(e) => onInfoChange(e.target.value)}
              placeholder="Notas, contexto, objetivos…"
              className="min-h-48 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-water)]"
            />
          )}
          {tab === "docs" && <DocsTab project={project} handlers={handlers} />}
          {tab === "checklist" && <ChecklistTab project={project} handlers={handlers} />}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] p-3">
          {confirmDel ? (
            <button
              type="button"
              onClick={() => handlers.remove(project.id)}
              className="text-sm font-semibold text-[var(--status-critical)]"
            >
              Confirmar borrado
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--status-critical)]"
            >
              Borrar proyecto
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-sm font-semibold text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function HealthPill({
  health,
  active,
  onClick,
}: {
  health: ProjectHealth;
  active: boolean;
  onClick: () => void;
}) {
  const color = HEALTH_COLOR[health];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
      style={{
        borderColor: active ? color : "var(--border)",
        background: active ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
        color: active ? color : "var(--text-muted)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {HEALTH_LABEL[health]}
    </button>
  );
}

function DocsTab({ project, handlers }: { project: Project; handlers: ModalHandlers }) {
  const ws = useWorkspace();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  function add() {
    if (!url.trim()) return;
    handlers.addDoc(project.id, label, url);
    setLabel("");
    setUrl("");
  }

  return (
    <div className="flex flex-col gap-2">
      {project.docs.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">Aún no hay documentos.</p>
      )}
      {project.docs.map((d) => (
        <div
          key={d.id}
          className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-[var(--row-hover)]"
        >
          <button
            type="button"
            onClick={() => ws.open({ kind: "url", href: d.url, title: d.label })}
            className="min-w-0 flex-1 truncate text-left text-sm text-[var(--text-primary)] hover:text-[var(--brand-sea)]"
          >
            {d.label}
          </button>
          <button
            type="button"
            onClick={() => handlers.deleteDoc(project.id, d.id)}
            aria-label="Quitar documento"
            className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--status-critical)] group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-[var(--border)] p-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…  o  /ruta-interna"
          className={fieldCls}
        />
        <div className="flex gap-1.5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nombre (opcional)"
            className={`${fieldCls} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={add}
            className="shrink-0 rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistTab({ project, handlers }: { project: Project; handlers: ModalHandlers }) {
  const [text, setText] = useState("");

  function add() {
    if (!text.trim()) return;
    handlers.addTask(project.id, text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col gap-1">
      {project.tasks.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">Sin tareas todavía.</p>
      )}
      {project.tasks.map((t) => (
        <div
          key={t.id}
          className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-[var(--row-hover)]"
        >
          <input
            type="checkbox"
            checked={t.done}
            onChange={() => handlers.toggleTask(project.id, t.id, !t.done)}
            className="accent-[var(--brand-sea)]"
          />
          <input
            defaultValue={t.label}
            key={t.label}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== t.label)
                handlers.updateTask(project.id, t.id, e.target.value.trim());
            }}
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
              t.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
            }`}
          />
          <button
            type="button"
            onClick={() => handlers.deleteTask(project.id, t.id)}
            aria-label="Quitar tarea"
            className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--status-critical)] group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva tarea"
          className={`${fieldCls} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
