"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ENTRY_KINDS,
  KIND_ACCENT,
  KIND_GLYPH,
  KIND_INK,
  KIND_LABEL,
  type EntryKind,
  type EntryStatus,
  type LogEntry,
  type ProjectOption,
} from "@/lib/bitacora";
import type { ProjectOwner } from "@/lib/projects";
import { TEAMS, TEAM_ACCENT, TEAM_LABEL, type Team } from "@/lib/teams";
import {
  addToProject,
  createEntry,
  deleteEntry,
  promoteToProject,
  updateEntry,
} from "@/app/bitacora/actions";
import { OwnerAvatar } from "@/components/projects/ProjectCard";

type StatusFilter = "open" | "all" | EntryStatus;
type Filter = { teams: Team[]; kind: EntryKind | "all"; status: StatusFilter; mine: boolean };

const subscribe = () => () => {};
/** false en el servidor y durante la hidratación; true después. Evita desajustes de zona horaria. */
function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function dayKey(iso: string, local: boolean): string {
  const d = new Date(iso);
  return local
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : iso.slice(0, 10);
}

function dayLabel(key: string, local: boolean): string {
  const now = new Date().toISOString();
  const today = dayKey(now, local);
  const yest = dayKey(new Date(Date.now() - 86_400_000).toISOString(), local);
  if (key === today) return "Hoy";
  if (key === yest) return "Ayer";
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(iso: string, local: boolean): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: local ? undefined : "UTC",
  });
}

function fmtDue(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function BitacoraBoard({
  entries: initialEntries,
  projects,
  members,
  currentMemberId,
  myTeams,
}: {
  entries: LogEntry[];
  projects: ProjectOption[];
  members: ProjectOwner[];
  currentMemberId: string;
  myTeams: Team[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<Filter>({
    teams: myTeams,
    kind: "all",
    status: "open",
    mine: false,
  });
  const [toast, setToast] = useState<{ text: string; href?: string } | null>(null);

  // Resincroniza con el servidor solo cuando llega un payload nuevo (tras `router.refresh`).
  const [seen, setSeen] = useState(initialEntries);
  if (seen !== initialEntries) {
    setSeen(initialEntries);
    setEntries(initialEntries);
  }

  const fire = useCallback(
    (p: Promise<unknown>) => {
      p.catch((err) => {
        console.error("[bitacora] escritura fallida:", err);
        router.refresh();
      });
    },
    [router],
  );

  const patch = useCallback(
    (id: string, local: Partial<LogEntry>, remote?: Parameters<typeof updateEntry>[1]) => {
      setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...local } : e)));
      if (remote && !id.startsWith("tmp_")) fire(updateEntry(id, remote));
    },
    [fire],
  );

  function flash(text: string, href?: string) {
    setToast({ text, href });
    setTimeout(() => setToast(null), 4500);
  }

  /** Crea la entrada de forma optimista y sustituye el id temporal cuando el servidor responde. */
  async function add(body: string, kind: EntryKind, team: Team | null) {
    const me = members.find((m) => m.id === currentMemberId) ?? null;
    const tmpId = `tmp_${Date.now()}`;
    const tmp: LogEntry = {
      id: tmpId,
      body,
      kind,
      status: "open",
      team,
      authorId: currentMemberId,
      author: me,
      ownerId: null,
      owner: null,
      dueDate: null,
      projectId: null,
      projectTitle: null,
      createdAt: new Date().toISOString(),
    };
    setEntries((es) => [tmp, ...es]);
    try {
      const real = await createEntry({ body, kind, team });
      setEntries((es) => es.map((e) => (e.id === tmpId ? { ...e, id: real.id, createdAt: real.createdAt } : e)));
    } catch (err) {
      console.error("[bitacora] crear entrada falló:", err);
      setEntries((es) => es.filter((e) => e.id !== tmpId));
      flash("No se pudo guardar la entrada.");
    }
  }

  async function promote(id: string) {
    try {
      const r = await promoteToProject(id);
      patch(id, { status: "promoted", projectId: r.projectId, projectTitle: r.title });
      flash(`Proyecto creado: ${r.title}`, "/proyectos");
    } catch (err) {
      console.error(err);
      flash("No se pudo crear el proyecto.");
    }
  }

  async function toProject(id: string, projectId: string) {
    try {
      const r = await addToProject(id, projectId);
      patch(id, { status: "promoted", projectId: r.projectId, projectTitle: r.title });
      flash(`Añadida como tarea de ${r.title}`, "/proyectos");
    } catch (err) {
      console.error(err);
      flash("No se pudo añadir al proyecto.");
    }
  }

  function remove(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
    if (!id.startsWith("tmp_")) fire(deleteEntry(id));
  }

  const visible = useMemo(
    () =>
      entries.filter(
        (e) =>
          (filter.teams.length === 0 || e.team === null || filter.teams.includes(e.team)) &&
          (filter.kind === "all" || e.kind === filter.kind) &&
          (filter.status === "all" ||
            (filter.status === "open" ? e.status === "open" : e.status === filter.status)) &&
          (!filter.mine || e.authorId === currentMemberId || e.ownerId === currentMemberId),
      ),
    [entries, filter, currentMemberId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of visible) {
      const k = dayKey(e.createdAt, hydrated);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return [...map.entries()];
  }, [visible, hydrated]);

  const count = (fn: (e: LogEntry) => boolean) => entries.filter(fn).length;

  return (
    <div className="pj mx-auto flex min-h-0 w-full max-w-[860px] flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="flex shrink-0 flex-col gap-3">
        <div className="aurora-light hub-reveal flex flex-wrap items-end justify-between gap-4 rounded-[20px] px-5 py-3 sm:px-6">
          <div>
            <h1 className="page-title text-2xl tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Bitácora
            </h1>
            <p className="max-w-md text-xs text-[var(--text-secondary)]">
              Apunta ideas y tareas sin pensarlo. Lo que merezca la pena, lo conviertes en proyecto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HeroStat label="Abiertas" value={count((e) => e.status === "open")} color="var(--brand-sea)" />
            <HeroStat
              label="Ideas"
              value={count((e) => e.status === "open" && e.kind === "idea")}
              color="var(--brand-sun)"
            />
            <HeroStat
              label="Tareas"
              value={count((e) => e.status === "open" && e.kind === "task")}
              color="var(--brand-water)"
            />
            <HeroStat label="Promovidas" value={count((e) => e.status === "promoted")} color="var(--status-good)" />
          </div>
        </div>

        <Composer defaultTeam={myTeams[0] ?? null} onSubmit={add} />

        <div className="glass flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5 shadow-[0_8px_30px_-20px_rgba(45,56,82,0.35)]">
          <Chip active={filter.teams.length === 0} onClick={() => setFilter((f) => ({ ...f, teams: [] }))}>
            Todos
          </Chip>
          {TEAMS.map((t) => (
            <Chip
              key={t}
              active={filter.teams.includes(t)}
              accent={TEAM_ACCENT[t]}
              onClick={() =>
                setFilter((f) => ({
                  ...f,
                  teams: f.teams.includes(t) ? f.teams.filter((x) => x !== t) : [...f.teams, t],
                }))
              }
            >
              {TEAM_LABEL[t]}
            </Chip>
          ))}
          <Sep />
          {(["all", ...ENTRY_KINDS] as const).map((k) => (
            <Chip
              key={k}
              active={filter.kind === k}
              accent={k === "all" ? undefined : KIND_INK[k]}
              onClick={() => setFilter((f) => ({ ...f, kind: k }))}
            >
              {k === "all" ? "Todo" : KIND_LABEL[k]}
            </Chip>
          ))}
          <Sep />
          {(
            [
              ["open", "Abiertas"],
              ["done", "Hechas"],
              ["promoted", "Promovidas"],
              ["discarded", "Descartadas"],
              ["all", "Todas"],
            ] as [StatusFilter, string][]
          ).map(([k, label]) => (
            <Chip key={k} active={filter.status === k} onClick={() => setFilter((f) => ({ ...f, status: k }))}>
              {label}
            </Chip>
          ))}
          <Sep />
          <Chip active={filter.mine} onClick={() => setFilter((f) => ({ ...f, mine: !f.mine }))}>
            Mías
          </Chip>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-24 pr-1">
        {groups.length === 0 ? (
          <div className="hub-reveal mx-auto mt-10 max-w-sm text-center">
            <div
              aria-hidden
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl text-xl"
              style={{
                background: "color-mix(in srgb, var(--brand-sun) 18%, transparent)",
                color: KIND_INK.idea,
              }}
            >
              ✦
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Nada por aquí todavía</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Escribe arriba lo primero que se te ocurra. Si hay filtros activos, prueba a quitarlos.
            </p>
          </div>
        ) : (
          groups.map(([key, list]) => (
            <section key={key} className="mb-5">
              <h2 className="sticky top-0 z-10 mb-2 bg-[color-mix(in_srgb,var(--page)_85%,transparent)] py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] backdrop-blur">
                {dayLabel(key, hydrated)}
              </h2>
              <div className="flex flex-col gap-2">
                {list.map((e, i) => (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    index={i}
                    local={hydrated}
                    members={members}
                    projects={projects}
                    onPatch={patch}
                    onPromote={promote}
                    onToProject={toProject}
                    onDelete={remove}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-[var(--brand-night)] px-4 py-2 text-xs font-semibold text-[var(--brand-sky)] shadow-lg">
            <span>{toast.text}</span>
            {toast.href && (
              <Link href={toast.href} className="text-[var(--brand-water)] hover:underline">
                Verlo →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Composer ---------- */

function Composer({
  defaultTeam,
  onSubmit,
}: {
  defaultTeam: Team | null;
  onSubmit: (body: string, kind: EntryKind, team: Team | null) => void;
}) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<EntryKind>("idea");
  const [team, setTeam] = useState<Team | null>(defaultTeam);
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = body.trim();
    if (!text) return;
    onSubmit(text, kind, team);
    setBody("");
    if (ref.current) ref.current.style.height = "auto";
    ref.current?.focus();
  }

  return (
    <div className="glass hub-reveal rounded-2xl border border-[var(--border)] p-3 shadow-[0_14px_40px_-24px_rgba(45,56,82,0.5)] transition-shadow focus-within:shadow-[0_18px_44px_-20px_color-mix(in_srgb,var(--brand-sea)_45%,transparent)]">
      <textarea
        ref={ref}
        value={body}
        rows={1}
        placeholder="Apunta una idea, una tarea, una nota…"
        onChange={(e) => {
          setBody(e.target.value);
          e.currentTarget.style.height = "auto";
          e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 220)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="block max-h-[220px] w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] p-0.5">
          {ENTRY_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
              style={{
                background: kind === k ? `color-mix(in srgb, ${KIND_ACCENT[k]} 20%, transparent)` : "transparent",
                color: kind === k ? KIND_INK[k] : "var(--text-muted)",
              }}
            >
              <span aria-hidden>{KIND_GLYPH[k]}</span>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <select
          value={team ?? ""}
          onChange={(e) => setTeam((e.target.value || null) as Team | null)}
          aria-label="Equipo"
          className="rounded-full border border-[var(--border)] bg-transparent px-2.5 py-1 text-xs font-semibold outline-none"
          style={{ color: team ? TEAM_ACCENT[team] : "var(--text-muted)" }}
        >
          <option value="">Sin equipo</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {TEAM_LABEL[t]}
            </option>
          ))}
        </select>
        <span className="ml-auto hidden text-[11px] text-[var(--text-muted)] sm:inline">
          Intro para añadir · Mayús+Intro, salto de línea
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim()}
          className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-[opacity,transform,box-shadow] enabled:hover:-translate-y-px enabled:hover:shadow-[0_8px_18px_-8px_var(--brand-sea)] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--brand-sea), color-mix(in srgb, var(--brand-sea) 70%, var(--brand-water)))" }}
        >
          Añadir
        </button>
      </div>
    </div>
  );
}

/* ---------- Entrada ---------- */

function EntryCard({
  entry: e,
  index,
  local,
  members,
  projects,
  onPatch,
  onPromote,
  onToProject,
  onDelete,
}: {
  entry: LogEntry;
  index: number;
  local: boolean;
  members: ProjectOwner[];
  projects: ProjectOption[];
  onPatch: (id: string, local: Partial<LogEntry>, remote?: Parameters<typeof updateEntry>[1]) => void;
  onPromote: (id: string) => void;
  onToProject: (id: string, projectId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<"closed" | "main" | "pick">("closed");
  const [confirmDel, setConfirmDel] = useState(false);

  const done = e.status === "done";
  const discarded = e.status === "discarded";
  const promoted = e.status === "promoted";
  const canToggle = e.status === "open" || done;
  const teamColor = e.team ? TEAM_ACCENT[e.team] : null;

  return (
    <article
      className="hub-reveal spotlight card group relative flex gap-3 p-3 transition-[opacity,transform,box-shadow,border-color] duration-200 hover:-translate-y-px"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, opacity: discarded ? 0.55 : undefined }}
    >
      {/* Glifo / casilla */}
      <button
        type="button"
        disabled={!canToggle}
        onClick={() =>
          onPatch(e.id, { status: done ? "open" : "done" }, { status: done ? "open" : "done" })
        }
        aria-label={done ? "Marcar como abierta" : "Marcar como hecha"}
        title={canToggle ? (done ? "Reabrir" : "Marcar como hecha") : undefined}
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition-transform enabled:hover:scale-105"
        style={{
          background: done
            ? "var(--status-good)"
            : `color-mix(in srgb, ${KIND_ACCENT[e.kind]} 18%, transparent)`,
          color: done ? "#fff" : KIND_INK[e.kind],
        }}
      >
        {done ? "✓" : KIND_GLYPH[e.kind]}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            defaultValue={e.body}
            rows={Math.min(8, e.body.split("\n").length + 1)}
            onBlur={(ev) => {
              const v = ev.target.value.trim();
              setEditing(false);
              if (v && v !== e.body) onPatch(e.id, { body: v }, { body: v });
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Escape") setEditing(false);
              if (ev.key === "Enter" && !ev.shiftKey) ev.currentTarget.blur();
            }}
            className="w-full resize-none rounded-lg bg-[var(--surface-1)] px-2 py-1 text-sm leading-relaxed text-[var(--text-primary)] outline-none ring-1 ring-[var(--brand-water)]"
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            title="Pulsa para editar"
            className="cursor-text whitespace-pre-wrap break-words text-sm leading-relaxed"
            style={{
              color: done || discarded ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : undefined,
            }}
          >
            {e.body}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--text-muted)]">
          {teamColor && e.team && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `color-mix(in srgb, ${teamColor} 14%, transparent)`, color: teamColor }}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: teamColor }} />
              {TEAM_LABEL[e.team]}
            </span>
          )}
          <span className="font-semibold" style={{ color: KIND_INK[e.kind] }}>
            {KIND_LABEL[e.kind]}
          </span>
          {e.author && (
            <span className="flex items-center gap-1">
              <OwnerAvatar owner={e.author} size={16} />
              {(e.author.name ?? e.author.email).split(" ")[0]}
            </span>
          )}
          <span className="tabular-nums">{timeLabel(e.createdAt, local)}</span>

          {e.kind === "task" && !promoted && (
            <>
              <select
                value={e.ownerId ?? ""}
                aria-label="Responsable"
                onChange={(ev) => {
                  const ownerId = ev.target.value || null;
                  onPatch(e.id, { ownerId, owner: members.find((m) => m.id === ownerId) ?? null }, { ownerId });
                }}
                className="max-w-[120px] rounded-full border border-[var(--border)] bg-transparent px-2 py-0.5 text-[11px] font-semibold outline-none"
              >
                <option value="">Sin responsable</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1" title="Fecha límite">
                <span aria-hidden>◷</span>
                <input
                  type="date"
                  value={e.dueDate ?? ""}
                  onChange={(ev) => onPatch(e.id, { dueDate: ev.target.value || null }, { dueDate: ev.target.value || null })}
                  className="w-[112px] rounded-md border border-[var(--border)] bg-transparent px-1 py-0.5 text-[11px] outline-none"
                />
              </label>
            </>
          )}
          {e.kind === "task" && promoted && e.dueDate && <span>◷ {fmtDue(e.dueDate)}</span>}

          {promoted && e.projectTitle && (
            <Link
              href="/proyectos"
              className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
              style={{
                background: "color-mix(in srgb, var(--status-good) 14%, transparent)",
                color: "var(--status-good)",
              }}
            >
              → {e.projectTitle}
            </Link>
          )}
          {discarded && <span className="font-semibold">Descartada</span>}
        </div>
      </div>

      {/* Menú */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setMenu((m) => (m === "closed" ? "main" : "closed"));
            setConfirmDel(false);
          }}
          aria-label="Opciones"
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] opacity-60 transition-opacity hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)] group-hover:opacity-100"
        >
          ⋯
        </button>
        {menu !== "closed" && (
          <div
            className="absolute right-0 top-8 z-30 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg"
            onMouseLeave={() => {
              setMenu("closed");
              setConfirmDel(false);
            }}
          >
            {menu === "main" ? (
              <>
                {!promoted && (
                  <>
                    <MenuItem
                      onClick={() => {
                        setMenu("closed");
                        onPromote(e.id);
                      }}
                    >
                      Convertir en proyecto
                    </MenuItem>
                    <MenuItem onClick={() => setMenu("pick")}>Añadir a un proyecto…</MenuItem>
                  </>
                )}
                {discarded ? (
                  <MenuItem
                    onClick={() => {
                      setMenu("closed");
                      onPatch(e.id, { status: "open" }, { status: "open" });
                    }}
                  >
                    Restaurar
                  </MenuItem>
                ) : (
                  !promoted && (
                    <MenuItem
                      onClick={() => {
                        setMenu("closed");
                        onPatch(e.id, { status: "discarded" }, { status: "discarded" });
                      }}
                    >
                      Descartar
                    </MenuItem>
                  )
                )}
                <MenuItem
                  danger
                  onClick={() => {
                    if (confirmDel) onDelete(e.id);
                    else setConfirmDel(true);
                  }}
                >
                  {confirmDel ? "¿Seguro? Pulsa otra vez" : "Eliminar"}
                </MenuItem>
              </>
            ) : (
              <div className="flex max-h-60 flex-col overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setMenu("main")}
                  className="px-3 py-1.5 text-left text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ← Elige proyecto
                </button>
                {projects.length === 0 && (
                  <span className="px-3 py-1.5 text-xs text-[var(--text-muted)]">No hay proyectos.</span>
                )}
                {projects.map((p) => (
                  <MenuItem
                    key={p.id}
                    onClick={() => {
                      setMenu("closed");
                      onToProject(e.id, p.id);
                    }}
                  >
                    <span className="block truncate">{p.title}</span>
                  </MenuItem>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------- Piezas pequeñas ---------- */

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
      style={danger ? { color: "var(--status-critical)" } : undefined}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-4 w-px bg-[var(--border)]" />;
}

function Chip({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
      style={{
        background: active
          ? `color-mix(in srgb, ${accent ?? "var(--brand-water)"} 16%, transparent)`
          : "transparent",
        color: active ? (accent ?? "var(--brand-sea)") : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass flex min-w-[78px] flex-col rounded-xl border border-[var(--border)] px-3 py-1">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="page-title text-xl leading-tight tabular-nums text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
