"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectColumn, ProjectOwner } from "@/lib/projects";
import { TEAMS, TEAM_LABEL, type Team } from "@/lib/teams";
import {
  createColumn,
  createProject,
  deleteColumn,
  moveProjects,
  renameColumn,
} from "@/app/proyectos/actions";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

type Filter = { team: Team | "all"; mine: boolean };

export function ProjectsBoard({
  columns,
  projects,
  members,
  currentMemberId,
}: {
  columns: ProjectColumn[];
  projects: Project[];
  members: ProjectOwner[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ team: "all", mine: false });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  // Valor síncrono del arrastre (los handlers de drop corren antes de que `dragId` se aplique).
  const dragRef = useRef<string | null>(null);

  const openProject = projects.find((p) => p.id === openId) ?? null;

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter.team === "all" || p.team === filter.team) &&
          (!filter.mine || p.ownerId === currentMemberId),
      ),
    [projects, filter, currentMemberId],
  );

  // columna id (o "__none__") -> proyectos ordenados
  const NONE = "__none__";
  const byColumn = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const c of columns) map.set(c.id, []);
    map.set(NONE, []);
    for (const p of visible) {
      const key = p.columnId && map.has(p.columnId) ? p.columnId : NONE;
      map.get(key)!.push(p);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [columns, visible]);

  const noColumn = byColumn.get(NONE) ?? [];

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  function commitMove(targetColId: string | null, orderedIds: string[]) {
    run(() => moveProjects(targetColId, orderedIds));
  }

  function endDrag() {
    dragRef.current = null;
    setDragId(null);
    setDropCol(null);
  }

  /** Suelta la tarjeta arrastrada en la columna `colId`, en la posición `beforeId` (o al final). */
  function dropInColumn(colId: string, beforeId: string | null) {
    const pid = dragRef.current;
    endDrag();
    if (!pid) return;
    const key = colId || NONE;
    const current = (byColumn.get(key) ?? []).map((p) => p.id).filter((id) => id !== pid);
    const at = beforeId ? current.indexOf(beforeId) : current.length;
    current.splice(at < 0 ? current.length : at, 0, pid);
    commitMove(colId || null, current);
  }

  return (
    <>
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Filtrar
        </span>
        <Chip active={filter.team === "all"} onClick={() => setFilter((f) => ({ ...f, team: "all" }))}>
          Todos
        </Chip>
        {TEAMS.map((t) => (
          <Chip
            key={t}
            active={filter.team === t}
            onClick={() => setFilter((f) => ({ ...f, team: f.team === t ? "all" : t }))}
          >
            {TEAM_LABEL[t]}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        <Chip active={filter.mine} onClick={() => setFilter((f) => ({ ...f, mine: !f.mine }))}>
          Míos
        </Chip>
        <button
          type="button"
          onClick={() => run(() => createColumn())}
          className="ml-auto rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
        >
          + Columna
        </button>
      </div>

      {/* Kanban */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {columns.map((col) => {
          const list = byColumn.get(col.id) ?? [];
          return (
            <Column
              key={col.id}
              col={col}
              projects={list}
              dragId={dragId}
              isDropTarget={dropCol === col.id}
              onColDragOver={() => setDropCol(col.id)}
              onColDrop={() => dropInColumn(col.id, null)}
              onCardDrop={(beforeId) => dropInColumn(col.id, beforeId)}
              onCardDragStart={(id) => {
                dragRef.current = id;
                setDragId(id);
              }}
              onCardDragEnd={endDrag}
              onOpen={setOpenId}
              onAdd={() => run(() => createProject(col.id))}
              onRename={(label) => run(() => renameColumn(col.id, label))}
              onDelete={() => run(() => deleteColumn(col.id))}
            />
          );
        })}

        {noColumn.length > 0 && (
          <Column
            col={{ id: NONE, label: "Sin columna", position: 999 }}
            projects={noColumn}
            dragId={dragId}
            isDropTarget={dropCol === NONE}
            onColDragOver={() => setDropCol(NONE)}
            onColDrop={() => dropInColumn("", null)}
            onCardDrop={(beforeId) => dropInColumn("", beforeId)}
            onCardDragStart={(id) => {
              dragRef.current = id;
              setDragId(id);
            }}
            onCardDragEnd={endDrag}
            onOpen={setOpenId}
          />
        )}
      </div>

      {openProject && (
        <ProjectModal
          project={openProject}
          members={members}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function Column({
  col,
  projects,
  dragId,
  isDropTarget,
  onColDragOver,
  onColDrop,
  onCardDrop,
  onCardDragStart,
  onCardDragEnd,
  onOpen,
  onAdd,
  onRename,
  onDelete,
}: {
  col: ProjectColumn;
  projects: Project[];
  dragId: string | null;
  isDropTarget: boolean;
  onColDragOver: () => void;
  onColDrop: () => void;
  onCardDrop: (beforeId: string | null) => void;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  onOpen: (id: string) => void;
  onAdd?: () => void;
  onRename?: (label: string) => void;
  onDelete?: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [menu, setMenu] = useState(false);
  const editable = !!onRename;

  return (
    <section
      className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--page)] transition-colors"
      style={isDropTarget ? { borderColor: "var(--brand-water)" } : undefined}
      onDragOver={(e) => {
        if (dragId) {
          e.preventDefault();
          onColDragOver();
        }
      }}
      onDrop={(e) => {
        if (dragId) {
          e.preventDefault();
          onColDrop();
        }
      }}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        {renaming && editable ? (
          <input
            autoFocus
            defaultValue={col.label}
            onBlur={(e) => {
              onRename?.(e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="min-w-0 flex-1 rounded bg-[var(--surface-1)] px-1 text-sm font-semibold text-[var(--text-primary)] outline-none ring-1 ring-[var(--brand-water)]"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {col.label}
          </span>
        )}
        <span className="shrink-0 rounded-full bg-[var(--pill-neutral-bg)] px-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
          {projects.length}
        </span>
        {editable && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-label="Opciones de la columna"
              className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
            >
              ⋯
            </button>
            {menu && (
              <div
                className="absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-md"
                onMouseLeave={() => setMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(true);
                    setMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
                >
                  Renombrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.();
                    setMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--status-critical)]"
                >
                  Borrar columna
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {projects.map((p) => (
          <div
            key={p.id}
            onDragOver={(e) => {
              if (dragId && dragId !== p.id) {
                e.preventDefault();
                onColDragOver();
              }
            }}
            onDrop={(e) => {
              if (dragId) {
                e.preventDefault();
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                const after = e.clientY > r.top + r.height / 2;
                onCardDrop(after ? nextId(projects, p.id) : p.id);
              }
            }}
          >
            <ProjectCard
              project={p}
              dragging={dragId === p.id}
              onOpen={() => onOpen(p.id)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onCardDragStart(p.id);
              }}
              onDragEnd={onCardDragEnd}
            />
          </div>
        ))}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl border border-dashed border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
          >
            + Proyecto
          </button>
        )}
      </div>
    </section>
  );
}

/** id del proyecto siguiente a `id` en la lista (o null si es el último). */
function nextId(list: Project[], id: string): string | null {
  const i = list.findIndex((p) => p.id === id);
  return i >= 0 && i + 1 < list.length ? list[i + 1].id : null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
      style={{
        background: active ? "color-mix(in srgb, var(--brand-water) 16%, transparent)" : "transparent",
        color: active ? "var(--brand-sea)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}
