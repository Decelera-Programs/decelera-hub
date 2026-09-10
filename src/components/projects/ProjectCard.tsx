"use client";

/* eslint-disable @next/next/no-img-element */
import type { Project } from "@/lib/projects";
import { HEALTH_COLOR, HEALTH_LABEL, taskProgress } from "@/lib/projects";
import { TEAM_ACCENT, TEAM_LABEL } from "@/lib/teams";

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
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const prog = taskProgress(project.tasks);
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : null;
  const teamColor = project.team ? TEAM_ACCENT[project.team] : "var(--text-muted)";

  const left = daysLeft(project.endDate);
  const overdue = left != null && left < 0 && project.health !== "done";
  const dueSoon = left != null && left >= 0 && left <= 3 && project.health !== "done";

  return (
    <button
      type="button"
      draggable
      onClick={onOpen}
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
    </button>
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
