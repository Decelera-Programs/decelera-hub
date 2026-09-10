"use client";

import { useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import { HEALTH_COLOR, HEALTH_LABEL, PROJECT_HEALTHS, taskProgress } from "@/lib/projects";
import { TEAM_ACCENT } from "@/lib/teams";

const DAY_MS = 86_400_000;
const DAY_PX = 22; // ancho de un día en la línea de tiempo
const ROW_H = 40;
const LABEL_W = 220;

function parseDate(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}
/** ISO `yyyy-mm-dd` en hora LOCAL (no UTC, para no descuadrar el día). */
function toISODate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
/** Suma días respetando cambios de hora (DST). */
function addDays(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

type DragState = {
  id: string;
  mode: "move" | "resize-l" | "resize-r";
  startClientX: number;
  origStart: number;
  origEnd: number;
  offsetDays: number; // desplazamiento aplicado (para el preview)
};

export function GanttView({
  projects,
  onOpen,
  onReschedule,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onReschedule: (id: string, startDate: string, endDate: string) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Suprime el `click` que sigue a un arrastre real (si no, abriría el modal).
  const justDragged = useRef(false);

  const dated = projects.filter((p) => p.startDate && p.endDate);
  const undatedList = projects.filter((p) => !p.startDate || !p.endDate);

  // Fecha de "hoy" fijada al montar (evita `Date.now()` en render).
  const [today] = useState(() => startOfDay(Date.now()));

  // Rango de la línea de tiempo: cubre todos los proyectos + hoy, con margen.
  const { rangeStart, days } = useMemo(() => {
    let min = today;
    let max = addDays(today, 21);
    for (const p of dated) {
      min = Math.min(min, parseDate(p.startDate!));
      max = Math.max(max, parseDate(p.endDate!));
    }
    const start = addDays(startOfDay(min), -7);
    const end = addDays(startOfDay(max), 14);
    return { rangeStart: start, days: Math.max(56, Math.round((end - start) / DAY_MS)) };
  }, [dated, today]);

  const width = days * DAY_PX;

  const xOf = (ms: number) => ((startOfDay(ms) - rangeStart) / DAY_MS) * DAY_PX;

  // Marcas de mes en la cabecera.
  const months = useMemo(() => {
    const out: { label: string; left: number; w: number }[] = [];
    let cursor = new Date(rangeStart);
    cursor.setDate(1);
    for (let i = 0; i < 24; i++) {
      const left = xOf(cursor.getTime());
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      const w = ((next.getTime() - cursor.getTime()) / DAY_MS) * DAY_PX;
      if (left > width) break;
      out.push({
        label: cursor.toLocaleDateString("es-ES", { month: "long", year: "2-digit" }),
        left,
        w,
      });
      cursor = next;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, width, days]);

  function onPointerDown(e: React.PointerEvent, p: Project, mode: DragState["mode"]) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: p.id,
      mode,
      startClientX: e.clientX,
      origStart: parseDate(p.startDate!),
      origEnd: parseDate(p.endDate!),
      offsetDays: 0,
    });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const deltaDays = Math.round((e.clientX - drag.startClientX) / DAY_PX);
    if (deltaDays !== drag.offsetDays) setDrag({ ...drag, offsetDays: deltaDays });
  }
  function onPointerUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.offsetDays === 0) return;
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    let s = d.origStart;
    let en = d.origEnd;
    if (d.mode === "move") {
      s = addDays(s, d.offsetDays);
      en = addDays(en, d.offsetDays);
    } else if (d.mode === "resize-l") {
      s = Math.min(addDays(s, d.offsetDays), en);
    } else {
      en = Math.max(addDays(en, d.offsetDays), s);
    }
    onReschedule(d.id, toISODate(s), toISODate(en));
  }

  function barGeom(p: Project) {
    let s = parseDate(p.startDate!);
    let en = parseDate(p.endDate!);
    if (drag && drag.id === p.id) {
      if (drag.mode === "move") {
        s = addDays(s, drag.offsetDays);
        en = addDays(en, drag.offsetDays);
      } else if (drag.mode === "resize-l") {
        s = Math.min(addDays(s, drag.offsetDays), en);
      } else {
        en = Math.max(addDays(en, drag.offsetDays), s);
      }
    }
    const left = xOf(s);
    const right = xOf(en) + DAY_PX; // día final inclusive
    return { left, width: Math.max(DAY_PX, right - left), s, en };
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Leyenda: el relleno de la barra es el equipo, el borde/punto es el seguimiento. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-1.5 text-[11px] text-[var(--text-muted)]">
        <span className="font-semibold uppercase tracking-wide">Seguimiento</span>
        {PROJECT_HEALTHS.map((h) => (
          <span key={h} className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: HEALTH_COLOR[h] }}
            />
            {HEALTH_LABEL[h]}
          </span>
        ))}
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div style={{ width: LABEL_W + width }} className="relative">
          {/* Cabecera de meses */}
          <div
            className="sticky top-0 z-20 flex h-8 border-b border-[var(--border)] bg-[var(--surface-1)]"
            style={{ width: LABEL_W + width }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)]"
              style={{ width: LABEL_W }}
            />
            <div className="relative" style={{ width }}>
              {months.map((m) => (
                <div
                  key={m.left}
                  className="absolute top-0 flex h-8 items-center border-l border-[var(--border)] pl-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  style={{ left: m.left, width: m.w }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Línea de "hoy" */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-8 z-10 w-px"
            style={{
              left: LABEL_W + xOf(today) + DAY_PX / 2,
              height: dated.length * ROW_H,
              background: "var(--brand-sea)",
            }}
          />

          {/* Filas */}
          {dated.length === 0 && (
            <p className="p-6 text-sm text-[var(--text-muted)]">
              Ningún proyecto tiene fecha de inicio y fin. Ponle fechas a un proyecto para verlo aquí.
            </p>
          )}
          {dated.map((p, i) => {
            const g = barGeom(p);
            const teamColor = p.team ? TEAM_ACCENT[p.team] : "var(--text-muted)";
            const overdue = g.en < today && p.health !== "done";
            const prog = taskProgress(p.tasks);
            const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
            return (
              <div
                key={p.id}
                className="flex border-b border-[var(--border)]"
                style={{ height: ROW_H, background: i % 2 ? "var(--row-alt)" : undefined }}
              >
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-[var(--border)] bg-[var(--surface-1)] px-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--row-hover)]"
                  style={{ width: LABEL_W }}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: HEALTH_COLOR[p.health] }}
                  />
                  <span className="truncate font-medium">{p.title}</span>
                </button>

                <div className="relative" style={{ width }}>
                  <div
                    className="group absolute top-1.5 flex items-center rounded-md text-white shadow-sm"
                    style={{
                      left: g.left,
                      width: g.width,
                      height: ROW_H - 12,
                      background: overdue ? "var(--status-critical)" : teamColor,
                      cursor: drag?.id === p.id ? "grabbing" : "grab",
                      // Borde = semáforo de seguimiento (siempre visible, independiente del
                      // color de equipo del relleno); si está vencida, el relleno ya lo dice.
                      outline: `2px solid ${overdue ? "var(--status-critical)" : HEALTH_COLOR[p.health]}`,
                      outlineOffset: 1,
                    }}
                    onPointerDown={(e) => onPointerDown(e, p, "move")}
                    onClick={(e) => {
                      if (drag || justDragged.current) return;
                      e.stopPropagation();
                      onOpen(p.id);
                    }}
                  >
                    {/* tirador izquierdo */}
                    <span
                      className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: "rgba(255,255,255,.35)" }}
                      onPointerDown={(e) => onPointerDown(e, p, "resize-l")}
                    />
                    {/* progreso dentro de la barra */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 rounded-l-md"
                      style={{ width: `${pct}%`, background: "rgba(255,255,255,.22)" }}
                    />
                    <span className="relative z-[1] flex min-w-0 items-center gap-1.5 truncate px-2 text-[11px] font-semibold">
                      <span
                        aria-hidden
                        title={HEALTH_LABEL[p.health]}
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: overdue ? "#fff" : HEALTH_COLOR[p.health],
                          boxShadow: "0 0 0 1.5px rgba(255,255,255,.85)",
                        }}
                      />
                      <span className="truncate">
                        {overdue && "⚠ "}
                        {p.title}
                      </span>
                    </span>
                    {/* tirador derecho */}
                    <span
                      className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: "rgba(255,255,255,.35)" }}
                      onPointerDown={(e) => onPointerDown(e, p, "resize-r")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {undatedList.length > 0 && (
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Sin fechas ({undatedList.length})
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {undatedList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpen(p.id)}
                className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
