"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectColumn, ProjectDoc, ProjectOwner, ProjectTask } from "@/lib/projects";
import { TEAMS, TEAM_LABEL, type Team } from "@/lib/teams";
import {
  addDoc as addDocAction,
  addTask as addTaskAction,
  createColumn,
  createProject,
  deleteColumn,
  deleteDoc as deleteDocAction,
  deleteProject,
  deleteTask as deleteTaskAction,
  moveProjects,
  renameColumn,
  toggleTask as toggleTaskAction,
  updateProject,
  updateTask as updateTaskAction,
} from "@/app/proyectos/actions";
import { GanttView } from "./GanttView";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal, type ModalHandlers } from "./ProjectModal";

const NONE = "__none__";
type Filter = { team: Team | "all"; mine: boolean };
type View = "kanban" | "gantt";

/** Proyecto en blanco recién creado (espejo de los defaults de la tabla). */
function blankProject(id: string, columnId: string | null, position: number): Project {
  return {
    id,
    title: "Nuevo proyecto",
    info: "",
    columnId,
    position,
    health: "on_track",
    ownerId: null,
    owner: null,
    team: null,
    startDate: null,
    endDate: null,
    tasks: [],
    docs: [],
  };
}

export function ProjectsBoard({
  columns: initialColumns,
  projects: initialProjects,
  members,
  currentMemberId,
}: {
  columns: ProjectColumn[];
  projects: Project[];
  members: ProjectOwner[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [projects, setProjects] = useState(initialProjects);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ team: "all", mine: false });
  const [view, setViewState] = useState<View>("kanban");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  // Vista recordada entre recargas.
  const [viewHydrated, setViewHydrated] = useState(false);
  if (!viewHydrated) {
    setViewHydrated(true);
    try {
      const v = localStorage.getItem("hub:proyectos:view");
      if (v === "gantt" || v === "kanban") setViewState(v);
    } catch {
      // sin localStorage
    }
  }
  function setView(v: View) {
    setViewState(v);
    try {
      localStorage.setItem("hub:proyectos:view", v);
    } catch {
      // sin persistencia
    }
  }

  // Resincroniza con el servidor SOLO cuando llega un payload nuevo (tras `router.refresh`
  // en un fallo o navegación). Patrón "ajustar estado en render" de la doc de React.
  const [seenCols, setSeenCols] = useState(initialColumns);
  const [seenProjects, setSeenProjects] = useState(initialProjects);
  if (seenCols !== initialColumns || seenProjects !== initialProjects) {
    setSeenCols(initialColumns);
    setSeenProjects(initialProjects);
    setColumns(initialColumns);
    setProjects(initialProjects);
  }

  /** Lanza la escritura en segundo plano; si falla, resincroniza desde el servidor. */
  const fire = useCallback(
    (p: Promise<unknown>) => {
      p.catch((err) => {
        console.error("[proyectos] escritura fallida:", err);
        router.refresh();
      });
    },
    [router],
  );

  const patchProject = useCallback(
    (id: string, patch: Partial<Project>, action?: Promise<unknown>) => {
      setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      if (action) fire(action);
    },
    [fire],
  );

  const reschedule = useCallback(
    (id: string, startDate: string, endDate: string) => {
      patchProject(id, { startDate, endDate }, updateProject(id, { startDate, endDate }));
    },
    [patchProject],
  );

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter.team === "all" || p.team === filter.team) &&
          (!filter.mine || p.ownerId === currentMemberId),
      ),
    [projects, filter, currentMemberId],
  );

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

  function endDrag() {
    dragRef.current = null;
    setDragId(null);
    setDropCol(null);
  }

  /** Suelta la tarjeta arrastrada en `colId` antes de `beforeId` (o al final). Optimista. */
  function dropInColumn(colId: string, beforeId: string | null) {
    const pid = dragRef.current;
    endDrag();
    if (!pid) return;
    const key = colId || NONE;
    const targetColId = colId || null;
    const ids = (byColumn.get(key) ?? []).map((p) => p.id).filter((id) => id !== pid);
    const at = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(at < 0 ? ids.length : at, 0, pid);

    setProjects((ps) => {
      const order = new Map(ids.map((id, i) => [id, i]));
      return ps.map((p) =>
        order.has(p.id) ? { ...p, columnId: targetColId, position: order.get(p.id)! } : p,
      );
    });
    fire(moveProjects(targetColId, ids));
  }

  // --- CRUD proyectos ---

  async function addProject(columnId: string | null) {
    const key = columnId ?? NONE;
    const position = (byColumn.get(key) ?? []).length;
    try {
      const id = await createProject(columnId);
      setProjects((ps) => [...ps, blankProject(id, columnId, position)]);
      setOpenId(id);
    } catch (err) {
      console.error("[proyectos] crear proyecto falló:", err);
      router.refresh();
    }
  }

  function removeProject(id: string) {
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setOpenId(null);
    fire(deleteProject(id));
  }

  // --- CRUD columnas ---

  async function addColumn() {
    try {
      const col = await createColumn();
      setColumns((cs) => [...cs, col]);
    } catch (err) {
      console.error("[proyectos] crear columna falló:", err);
      router.refresh();
    }
  }
  function renameCol(id: string, label: string) {
    const clean = label.trim() || "Sin nombre";
    setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, label: clean } : c)));
    fire(renameColumn(id, clean));
  }
  function removeColumn(id: string) {
    setColumns((cs) => cs.filter((c) => c.id !== id));
    setProjects((ps) => ps.map((p) => (p.columnId === id ? { ...p, columnId: null } : p)));
    fire(deleteColumn(id));
  }

  // --- Handlers del modal (optimistas) ---

  const openProject = projects.find((p) => p.id === openId) ?? null;

  const modalHandlers: ModalHandlers = useMemo(() => {
    const setTasks = (pid: string, fn: (t: ProjectTask[]) => ProjectTask[]) =>
      setProjects((ps) => ps.map((p) => (p.id === pid ? { ...p, tasks: fn(p.tasks) } : p)));
    const setDocs = (pid: string, fn: (d: ProjectDoc[]) => ProjectDoc[]) =>
      setProjects((ps) => ps.map((p) => (p.id === pid ? { ...p, docs: fn(p.docs) } : p)));

    return {
      patch: (pid, patch) => {
        // patch usa las claves del modal (ownerId/team/…); reflejamos owner también.
        const local: Partial<Project> = { ...patch };
        if ("ownerId" in patch) {
          local.ownerId = patch.ownerId ?? null;
          local.owner = patch.ownerId
            ? members.find((m) => m.id === patch.ownerId) ?? null
            : null;
        }
        patchProject(pid, local, updateProject(pid, patch));
      },
      addTask: async (pid, label) => {
        const tmp: ProjectTask = { id: `tmp_${Date.now()}`, label, done: false, position: 1e9 };
        setTasks(pid, (t) => [...t, tmp]);
        try {
          const real = await addTaskAction(pid, label);
          if (real) setTasks(pid, (t) => t.map((x) => (x.id === tmp.id ? real : x)));
          else setTasks(pid, (t) => t.filter((x) => x.id !== tmp.id));
        } catch (err) {
          console.error(err);
          router.refresh();
        }
      },
      toggleTask: (pid, id, done) => {
        setTasks(pid, (t) => t.map((x) => (x.id === id ? { ...x, done } : x)));
        if (!id.startsWith("tmp_")) fire(toggleTaskAction(id, done));
      },
      updateTask: (pid, id, label) => {
        setTasks(pid, (t) => t.map((x) => (x.id === id ? { ...x, label } : x)));
        if (!id.startsWith("tmp_")) fire(updateTaskAction(id, label));
      },
      deleteTask: (pid, id) => {
        setTasks(pid, (t) => t.filter((x) => x.id !== id));
        if (!id.startsWith("tmp_")) fire(deleteTaskAction(id));
      },
      addDoc: async (pid, label, url) => {
        const tmp: ProjectDoc = { id: `tmp_${Date.now()}`, label: label || url, url, position: 1e9 };
        setDocs(pid, (d) => [...d, tmp]);
        try {
          const real = await addDocAction(pid, label, url);
          if (real) setDocs(pid, (d) => d.map((x) => (x.id === tmp.id ? real : x)));
          else setDocs(pid, (d) => d.filter((x) => x.id !== tmp.id));
        } catch (err) {
          console.error(err);
          router.refresh();
        }
      },
      deleteDoc: (pid, id) => {
        setDocs(pid, (d) => d.filter((x) => x.id !== id));
        if (!id.startsWith("tmp_")) fire(deleteDocAction(id));
      },
      remove: removeProject,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire, members, patchProject, router]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] p-0.5">
          <ViewTab active={view === "kanban"} onClick={() => setView("kanban")}>
            Kanban
          </ViewTab>
          <ViewTab active={view === "gantt"} onClick={() => setView("gantt")}>
            Gantt
          </ViewTab>
        </div>
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
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
        {view === "kanban" && (
          <button
            type="button"
            onClick={addColumn}
            className="ml-auto rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
          >
            + Columna
          </button>
        )}
      </div>

      {view === "gantt" ? (
        <GanttView projects={visible} columns={columns} onOpen={setOpenId} onReschedule={reschedule} />
      ) : (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            col={col}
            projects={byColumn.get(col.id) ?? []}
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
            onAdd={() => addProject(col.id)}
            onRename={(label) => renameCol(col.id, label)}
            onDelete={() => removeColumn(col.id)}
          />
        ))}

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
      )}

      {openProject && (
        <ProjectModal
          project={openProject}
          members={members}
          handlers={modalHandlers}
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

function ViewTab({
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
      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--brand-sea)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}
