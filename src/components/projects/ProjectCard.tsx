"use client";

/* eslint-disable @next/next/no-img-element */
import type { Project } from "@/lib/projects";
import { HEALTH_COLOR, HEALTH_LABEL, taskProgress } from "@/lib/projects";
import { TEAM_ACCENT, TEAM_LABEL } from "@/lib/teams";

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

  return (
    <button
      type="button"
      draggable
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="card group flex w-full flex-col gap-2.5 p-3 text-left transition-shadow hover:shadow-md"
      style={{ opacity: dragging ? 0.4 : undefined, cursor: "grab" }}
    >
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
      </div>

      {project.info && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {project.info}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {project.team && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: `color-mix(in srgb, ${TEAM_ACCENT[project.team]} 16%, transparent)`,
              color: TEAM_ACCENT[project.team],
            }}
          >
            {TEAM_LABEL[project.team]}
          </span>
        )}
        {prog && (
          <span
            className="rounded-full bg-[var(--pill-neutral-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
            title="Checklist"
          >
            ✓ {prog.done}/{prog.total}
          </span>
        )}
        {project.docs.length > 0 && (
          <span
            className="rounded-full bg-[var(--pill-neutral-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
            title="Documentos"
          >
            🔗 {project.docs.length}
          </span>
        )}
        <span className="ml-auto">
          {project.owner ? (
            <OwnerAvatar owner={project.owner} />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">sin encargado</span>
          )}
        </span>
      </div>
    </button>
  );
}

function OwnerAvatar({ owner }: { owner: NonNullable<Project["owner"]> }) {
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
        width={20}
        height={20}
        referrerPolicy="no-referrer"
        className="rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden
      title={owner.name ?? owner.email}
      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold"
      style={{ background: "var(--tile-1-bg)", color: "var(--tile-1-ink)" }}
    >
      {initials || "?"}
    </span>
  );
}
