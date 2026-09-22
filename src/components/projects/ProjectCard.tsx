"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { Project } from "@/lib/projects";
import { HEALTH_COLOR, HEALTH_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, taskProgress } from "@/lib/projects";
import { TEAM_ACCENT, TEAM_LABEL } from "@/lib/teams";
import { useWorkspace } from "@/components/WorkspaceContext";

const DAY_MS = 86_400_000;

/** Días hasta la fecha límite (negativo = ya pasó). null si no hay fecha. */
function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today.getTime()) / DAY_MS);
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function ProjectCard({
  project,
  dragging,
  onOpen,
  onToggleTask,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  dragging: boolean;
  onOpen: () => void;
  onToggleTask?: (taskId: string, done: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const ws = useWorkspace();
  const [expanded, setExpanded] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const prog = taskProgress(project.tasks);
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : null;
  const teamColor = project.team ? TEAM_ACCENT[project.team] : "var(--text-muted)";

  const left = daysLeft(project.endDate);
  const overdue = left != null && left < 0 && project.health !== "done";
  const dueSoon = left != null && left >= 0 && left <= 3 && project.health !== "done";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="card group relative flex w-full flex-col gap-2 overflow-hidden p-3 pl-4 text-left transition-shadow hover:shadow-md"
      style={{
        opacity: dragging ? 0.4 : undefined,
        cursor: "grab",
        borderColor: overdue ? "var(--status-critical)" : undefined,
        background: overdue
          ? "color-mix(in srgb, var(--status-critical) 7%, var(--surface-1))"
          : undefined,
      }}
    >
      {/* Franja de color del equipo */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: teamColor }}
      />

      <div className="flex items-start gap-2">
        {/* Solo se marca la prioridad alta: es la única que pide atención inmediata. */}
        {project.priority === "high" && <PriorityFlag />}
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ background: HEALTH_COLOR[project.health] }}
          title={HEALTH_LABEL[project.health]}
        />
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[var(--text-primary)]">
          {project.title}
        </span>
        {project.owner && <OwnerAvatar owner={project.owner} />}
      </div>

      {project.info && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {project.info}
        </p>
      )}

      {/* Barra de progreso de la checklist */}
      {pct != null && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pill-neutral-bg)]">
            <span
              className="block h-full rounded-full transition-[width]"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "var(--status-good)" : teamColor,
              }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
            {pct}%
          </span>
          <ExpandChevron
            expanded={expanded}
            label="checklist"
            onClick={() => setExpanded((v) => !v)}
          />
        </div>
      )}

      {/* Checklist desplegable, sin abrir la tarjeta */}
      {expanded && prog && (
        <div
          className="flex flex-col gap-0.5 rounded-lg bg-[var(--pill-neutral-bg)] p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {project.tasks
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--row-hover)]"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => onToggleTask?.(t.id, !t.done)}
                  className="accent-[var(--brand-sea)]"
                />
                <span
                  className={`min-w-0 flex-1 truncate ${
                    t.done
                      ? "text-[var(--text-muted)] line-through"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {t.label}
                </span>
                {t.owner && <OwnerAvatar owner={t.owner} size={16} />}
              </label>
            ))}
        </div>
      )}

      {/* Documentos */}
      {project.docs.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
            🔗 {project.docs.length} {project.docs.length === 1 ? "documento" : "documentos"}
          </span>
          <ExpandChevron
            expanded={docsExpanded}
            label="documentos"
            onClick={() => setDocsExpanded((v) => !v)}
          />
        </div>
      )}

      {docsExpanded && project.docs.length > 0 && (
        <div
          className="flex flex-col gap-0.5 rounded-lg bg-[var(--pill-neutral-bg)] p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {project.docs
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => ws.open({ kind: "url", href: d.url, title: d.label })}
                className="truncate rounded px-1 py-0.5 text-left text-xs text-[var(--brand-sea)] hover:bg-[var(--row-hover)] hover:underline"
              >
                {d.label}
              </button>
            ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {project.team ? (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: teamColor }}
          >
            {TEAM_LABEL[project.team]}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">Sin equipo</span>
        )}

        {project.endDate && (
          <span
            className="shrink-0 text-[11px] font-semibold tabular-nums"
            style={{
              color: overdue
                ? "var(--status-critical)"
                : dueSoon
                  ? "var(--status-warning)"
                  : "var(--text-muted)",
            }}
            title={overdue ? `Vencido hace ${Math.abs(left!)} d` : `Fecha límite`}
          >
            {overdue ? "⚠ " : ""}
            {fmtDate(project.endDate)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Botón ▸ que despliega una sección de la tarjeta sin abrirla ni arrastrarla. */
function ExpandChevron({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={expanded ? `Ocultar ${label}` : `Ver ${label}`}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-4 w-4 shrink-0 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
    >
      <span
        aria-hidden
        className="inline-block text-[10px] leading-none transition-transform"
        style={{ transform: expanded ? "rotate(90deg)" : undefined }}
      >
        ▸
      </span>
    </button>
  );
}

/** Marca de prioridad alta (única que se señala; media/baja no añaden ruido visual). */
function PriorityFlag() {
  return (
    <span
      aria-hidden
      title={`Prioridad ${PRIORITY_LABEL.high.toLowerCase()}`}
      className="mt-0.5 shrink-0 text-[10px] leading-none"
      style={{ color: PRIORITY_COLOR.high }}
    >
      ▲
    </span>
  );
}

export function OwnerAvatar({
  owner,
  size = 20,
}: {
  owner: NonNullable<Project["owner"]>;
  size?: number;
}) {
  const initials = (owner.name ?? owner.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  if (owner.avatarUrl) {
    return (
      <img
        src={owner.avatarUrl}
        alt={owner.name ?? owner.email}
        title={owner.name ?? owner.email}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden
      title={owner.name ?? owner.email}
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.45),
        background: "var(--tile-1-bg)",
        color: "var(--tile-1-ink)",
      }}
    >
      {initials || "?"}
    </span>
  );
}
