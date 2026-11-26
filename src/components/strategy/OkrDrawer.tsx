"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HEALTH_COLOR, HEALTH_LABEL } from "@/lib/projects";
import {
  KIND_LABEL,
  OKR_UNITS,
  QUARTER_LABEL,
  UNIT_LABEL,
  fmtValue,
  type OkrNode,
  type OkrProject,
  type OkrUnit,
  type Quad,
} from "@/lib/okr";
import type { OkrPatch } from "@/app/estrategia/actions";
import { ProgressBar, StatusChip, ValueInput, pct } from "./okr-ui";

type Props = {
  node: OkrNode;
  path: OkrNode[];
  projects: OkrProject[];
  isAdmin: boolean;
  currentQuarter: number | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onPatch: (id: string, patch: OkrPatch) => void;
  onSetProjects: (id: string, projectIds: string[]) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (id: string) => void;
};

const label = "text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]";
const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-sea)]";

export function OkrDrawer({
  node,
  path,
  projects,
  isAdmin,
  currentQuarter,
  onClose,
  onOpen,
  onPatch,
  onSetProjects,
  onAdd,
  onDelete,
}: Props) {
  const { item } = node;
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);

  // (El padre monta este panel con `key={id}`: al cambiar de nodo vuelve al modo lectura.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasMetric = item.target != null;
  const setQuarter = (kind: "targets" | "actuals", i: number, v: number | null) => {
    const next = [...item[kind]] as Quad<number | null>;
    next[i] = v;
    onPatch(item.id, { [kind]: next });
  };
  const canAdd = item.kind !== "initiative";

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label={`Detalle ${item.code}`}
        className="glass fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-[var(--border)] shadow-[-20px_0_40px_-24px_rgba(17,36,80,0.35)]"
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px]">
              {path.map((n, i) => (
                <span key={n.item.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[var(--text-muted)]">›</span>}
                  <button
                    type="button"
                    onClick={() => onOpen(n.item.id)}
                    className="rounded-md px-1.5 py-0.5 font-semibold tabular-nums transition-colors hover:bg-[var(--row-hover)]"
                    style={{ color: n.item.id === item.id ? "var(--brand-sea)" : "var(--text-secondary)" }}
                    title={n.item.title}
                  >
                    {n.item.kind === "objective" ? `O${n.item.code}` : n.item.code} · {pct(n.progress)}
                  </button>
                </span>
              ))}
            </div>
            <p className={label}>
              {KIND_LABEL[item.kind]} {item.code}
              {item.owner && <span className="normal-case tracking-normal"> · {item.owner}</span>}
            </p>
            {editing ? (
              <textarea
                aria-label="Título"
                className={`${field} mt-1 resize-none font-semibold`}
                rows={3}
                defaultValue={item.title}
                onBlur={(e) => e.target.value.trim() && e.target.value !== item.title && onPatch(item.id, { title: e.target.value })}
              />
            ) : (
              <h2 className="mt-1 text-[15px] font-semibold leading-snug text-[var(--text-primary)]">{item.title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Estado */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <StatusChip status={node.status} />
              <span className="text-xs text-[var(--text-secondary)]">
                Avance <strong className="tabular-nums text-[var(--text-primary)]">{pct(node.progress)}</strong>
                {node.expected != null && node.expected > 0.02 && (
                  <> · tocaría <span className="tabular-nums">{pct(node.expected)}</span></>
                )}
              </span>
            </div>
            <ProgressBar progress={node.progress} expected={node.expected} status={node.status} height={8} />
            {hasMetric && (
              <div className="flex items-baseline justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                <div>
                  <p className={label}>{node.valueQuarter != null ? `Dato ${QUARTER_LABEL[node.valueQuarter]}` : "Punto de partida"}</p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{fmtValue(node.value, item.unit)}</p>
                </div>
                <div className="text-right">
                  <p className={label}>Meta {item.direction === "down" ? "(menos es mejor)" : ""}</p>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--text-muted)]">{fmtValue(item.target, item.unit)}</p>
                </div>
              </div>
            )}
            {!hasMetric && node.children.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
                Sin métrica propia: el avance es la media de sus {node.children.length} {node.children[0].item.kind === "kr" ? "KRs" : "iniciativas"}.
              </p>
            )}
          </section>

          {/* Trimestres */}
          {(hasMetric || editing) && (
            <section>
              <p className={`${label} mb-2`}>Trimestres · meta y dato real</p>
              <div className="grid grid-cols-4 gap-2">
                {QUARTER_LABEL.map((q, i) => {
                  const t = item.targets[i];
                  const a = item.actuals[i];
                  const ratio = t && a != null ? Math.min(1, Math.max(0, item.direction === "up" ? a / t : t / (a || t))) : null;
                  return (
                    <div
                      key={q}
                      className="rounded-xl border bg-[var(--surface-1)] p-2"
                      style={{ borderColor: currentQuarter === i ? "var(--brand-sea)" : "var(--border)" }}
                    >
                      <p className="mb-1 flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                        {q}
                        {currentQuarter === i && <span className="text-[9px] font-semibold text-[var(--brand-sea)]">ahora</span>}
                      </p>
                      {editing ? (
                        <ValueInput label={`Meta ${q}`} unit={item.unit} value={t} onCommit={(v) => setQuarter("targets", i, v)} />
                      ) : (
                        <p className="text-xs tabular-nums text-[var(--text-muted)]">meta {fmtValue(t, item.unit)}</p>
                      )}
                      <div className="mt-1.5">
                        {isAdmin ? (
                          <ValueInput label={`Real ${q}`} unit={item.unit} value={a} onCommit={(v) => setQuarter("actuals", i, v)} placeholder="real" />
                        ) : (
                          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{fmtValue(a, item.unit)}</p>
                        )}
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--text-muted) 16%, transparent)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round((ratio ?? 0) * 100)}%`, background: "var(--brand-sea)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {isAdmin && !editing && <p className="mt-2 text-[11px] text-[var(--text-muted)]">Escribe el dato real y pulsa Enter: se guarda al instante.</p>}
            </section>
          )}

          {/* Hijos */}
          {node.children.length > 0 && (
            <section>
              <p className={`${label} mb-2`}>{node.children[0].item.kind === "kr" ? "Key results" : "Iniciativas"}</p>
              <ul className="space-y-1">
                {node.children.map((c) => (
                  <li key={c.item.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(c.item.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--row-hover)]"
                    >
                      <span className="w-9 shrink-0 text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">{c.item.code}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">{c.item.title}</span>
                      <span className="w-14 shrink-0">
                        <ProgressBar progress={c.progress} expected={c.expected} status={c.status} height={4} />
                      </span>
                      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--text-secondary)]">{pct(c.progress)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Proyectos */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className={label}>Proyectos que lo mueven</p>
              {isAdmin && (
                <button type="button" onClick={() => setLinking((v) => !v)} className="text-[11px] font-semibold text-[var(--brand-sea)] hover:underline">
                  {linking ? "Listo" : "Enlazar proyectos"}
                </button>
              )}
            </div>
            {linking ? (
              <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5">
                {projects.map((p) => {
                  const on = item.projectIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--row-hover)]">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onSetProjects(item.id, on ? item.projectIds.filter((x) => x !== p.id) : [...item.projectIds, p.id])}
                        />
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: HEALTH_COLOR[p.health] }} />
                        <span className="min-w-0 truncate">{p.title}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : node.projects.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Ningún proyecto enlazado todavía.</p>
            ) : (
              <ul className="space-y-1.5">
                {node.projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/proyectos"
                      className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 transition-colors hover:border-[var(--brand-water)]"
                    >
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: HEALTH_COLOR[p.health] }} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">{p.title}</span>
                      <span className="shrink-0 text-[11px] text-[var(--text-secondary)]">
                        {p.tasksTotal > 0 ? `${p.tasksDone}/${p.tasksTotal} · ` : ""}
                        {HEALTH_LABEL[p.health]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notas */}
          {!editing && (item.notes || item.keyProject) && (
            <section className="space-y-2 text-[13px] text-[var(--text-secondary)]">
              {item.keyProject && (
                <p>
                  <span className={label}>Proyecto clave 2027</span>
                  <br />
                  {item.keyProject}
                </p>
              )}
              {item.notes && (
                <p>
                  <span className={label}>Notas</span>
                  <br />
                  {item.notes}
                </p>
              )}
            </section>
          )}

          {/* Edición completa (admins) */}
          {isAdmin && editing && (
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className={label}>Responsable</span>
                  <input className={field} defaultValue={item.owner} onBlur={(e) => e.target.value !== item.owner && onPatch(item.id, { owner: e.target.value })} />
                </label>
                <label className="space-y-1">
                  <span className={label}>Unidad</span>
                  <select className={field} value={item.unit} onChange={(e) => onPatch(item.id, { unit: e.target.value as OkrUnit })}>
                    {OKR_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABEL[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className={label}>Punto de partida</span>
                  <ValueInput label="Punto de partida" unit={item.unit} value={item.baseline} onCommit={(v) => onPatch(item.id, { baseline: v })} />
                </label>
                <label className="space-y-1">
                  <span className={label}>Meta final</span>
                  <ValueInput label="Meta final" unit={item.unit} value={item.target} onCommit={(v) => onPatch(item.id, { target: v })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <input type="checkbox" checked={item.direction === "down"} onChange={(e) => onPatch(item.id, { direction: e.target.checked ? "down" : "up" })} />
                Menos es mejor (p.ej. semanas de ciclo)
              </label>
              <label className="block space-y-1">
                <span className={label}>Proyecto clave 2027</span>
                <input className={field} defaultValue={item.keyProject} onBlur={(e) => e.target.value !== item.keyProject && onPatch(item.id, { keyProject: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className={label}>Notas</span>
                <textarea className={`${field} resize-none`} rows={3} defaultValue={item.notes} onBlur={(e) => e.target.value !== item.notes && onPatch(item.id, { notes: e.target.value })} />
              </label>
            </section>
          )}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--row-hover)]"
              style={editing ? { background: "var(--brand-sea)", color: "#fff", borderColor: "var(--brand-sea)" } : undefined}
            >
              {editing ? "Hecho" : "Editar"}
            </button>
            {canAdd && (
              <button
                type="button"
                onClick={() => onAdd(item.id)}
                className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--row-hover)]"
              >
                + {item.kind === "objective" ? "KR" : "Iniciativa"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--status-critical)] transition-colors hover:bg-[var(--pill-critical-bg)]"
            >
              Eliminar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
