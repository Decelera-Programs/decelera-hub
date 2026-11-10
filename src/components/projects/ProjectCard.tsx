"use client";

/* eslint-disable @next/next/no-img-element */
import type { Project, StrategicPriority } from "@/lib/projects";
import { strategicAccent } from "@/lib/projects";
import { HEALTH_COLOR, HEALTH_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, taskProgress } from "@/lib/projects";
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
  priorities = [],
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  /** Prioridades estratégicas del proyecto (ya resueltas), para los chips. */
  priorities?: StrategicPriority[];
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const prog = taskProgress(project.tasks);
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : null;
  const teamColor = project.team ? TEAM_ACCENT[project.team] : "var(--text-muted)";
  const next = project.tasks
    .slice()
    .sort((a, b) => a.position - b.position)
    .find((t) => !t.done);

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
      className="hub-reveal spotlight card group relative flex w-full flex-col gap-2 overflow-hidden p-3 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-water)_55%,var(--border))] hover:shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--brand-sea)_55%,transparent)]"
      style={{
        opacity: dragging ? 0.4 : undefined,
        cursor: "grab",
        borderColor: overdue ? "var(--status-critical)" : undefined,
      }}
    >
      {/* Fila superior: equipo · prioridad · responsable */}
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${teamColor} 14%, transparent)`, color: teamColor }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: teamColor }} />
          {project.team ? TEAM_LABEL[project.team] : "Sin equipo"}
        </span>
        {project.priority === "high" && <PriorityFlag />}
        <span
          aria-hidden
          className="ml-auto h-2 w-2 shrink-0 rounded-full"
          style={{ background: HEALTH_COLOR[project.health], boxShadow: `0 0 0 3px color-mix(in srgb, ${HEALTH_COLOR[project.health]} 20%, transparent)` }}
          title={HEALTH_LABEL[project.health]}
        />
        {project.owner && <OwnerAvatar owner={project.owner} size={22} />}
      </div>

      <span className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{project.title}</span>

      {priorities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {priorities.map((sp) => {
            const c = strategicAccent(sp.position);
            return (
              <span
                key={sp.id}
                title={sp.title}
                className="max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}
              >
                {sp.shortName || sp.title}
              </span>
            );
          })}
        </div>
      )}

      {project.info && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">{project.info}</p>
      )}

      {pct != null && prog && (
        <div className="flex flex-col gap-1">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--pill-neutral-bg)]">
            <span
              className="block h-full rounded-full transition-[width]"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "var(--status-good)" : `linear-gradient(90deg, var(--brand-water), ${teamColor})`,
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
              {next ? (
                <>
                  <span aria-hidden className="text-[var(--brand-sea)]">→ </span>
                  {next.label}
                </>
              ) : (
                <span className="font-semibold text-[var(--status-good)]">✓ Todo hecho</span>
              )}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-[var(--text-muted)]">
              {prog.done}/{prog.total}
            </span>
          </div>
        </div>
      )}

      {(project.endDate || project.docs.length > 0) && (
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
          {project.endDate && (
            <span
              className="tabular-nums"
              style={{
                color: overdue ? "var(--status-critical)" : dueSoon ? "var(--status-warning)" : undefined,
              }}
              title={overdue ? `Vencido hace ${Math.abs(left!)} d` : "Fecha límite"}
            >
              {overdue ? "⚠ " : "◷ "}
              {fmtDate(project.endDate)}
            </span>
          )}
          {project.docs.length > 0 && <span>🔗 {project.docs.length}</span>}
        </div>
      )}
    </div>
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
