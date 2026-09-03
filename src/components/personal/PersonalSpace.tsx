"use client";

import { type DragEvent, useEffect, useRef, useState, useTransition } from "react";
import type { HubApp } from "@/lib/apps";
import type { Folder, Widget, WidgetKind } from "@/lib/hub";
import { createFolder, createWidget, saveSpaceLayout } from "@/app/actions";
import { Label } from "@/components/HubPrimitives";
import { SpaceFolder } from "./SpaceFolder";
import { SpaceWidget } from "./SpaceWidget";

// Rejilla de 3 columnas con colocación libre: cada carpeta/widget vive en una
// celda concreta (`cell`) y puede haber huecos. En móvil (1 columna) se empaqueta
// por orden de celda.
const COLS = 3;
// Alto de un hueco vacío (y zona de drop). Corto para que una fila con widgets
// colapsados no quede inflada por un hueco al lado.
const MIN_CELL_H = 120;

type Entry =
  | { key: string; cell: number; type: "folder"; folder: Folder }
  | { key: string; cell: number; type: "widget"; widget: Widget };

let KEY = 0;
const nextKey = () => `e${KEY++}`;

function build(folders: Folder[], widgets: Widget[]): Entry[] {
  const es: Entry[] = [
    ...folders.map((f) => ({ key: nextKey(), cell: f.position, type: "folder" as const, folder: f })),
    ...widgets.map((w) => ({ key: nextKey(), cell: w.position, type: "widget" as const, widget: w })),
  ];
  // Repara colisiones o valores absurdos (p. ej. epoch de una creación antigua),
  // conservando los huecos intencionados.
  es.sort((a, b) => a.cell - b.cell);
  const seen = new Set<number>();
  let free = 0;
  for (const e of es) {
    if (e.cell < 0 || e.cell > 9999 || seen.has(e.cell)) {
      while (seen.has(free)) free++;
      e.cell = free;
    }
    seen.add(e.cell);
    free = Math.max(free, e.cell + 1);
  }
  return es;
}

const ADD_OPTIONS: { key: "folder" | WidgetKind; label: string }[] = [
  { key: "folder", label: "Nueva carpeta" },
  { key: "note", label: "Nota" },
  { key: "links", label: "Lista de enlaces" },
  { key: "todo", label: "To-do" },
];

export function PersonalSpace({
  folders,
  widgets,
  apps,
}: {
  folders: Folder[];
  widgets: Widget[];
  apps: HubApp[];
}) {
  // El estado local es la fuente de verdad en sesión; los server actions de aquí no revalidan.
  const [entries, setEntries] = useState<Entry[]>(() => build(folders, widgets));
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [appDragging, setAppDragging] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropCell, setDropCell] = useState<number | null>(null);
  // Espejos síncronos: los handlers de DnD se disparan antes de que React re-renderice.
  const dragKeyRef = useRef<string | null>(null);
  const dropCellRef = useRef<number | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  // Mientras se arrastra una tarjeta de app por la página, marcamos las carpetas como destino.
  useEffect(() => {
    const onStart = (e: globalThis.DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes("application/x-hub-app")) {
        setAppDragging(true);
      }
    };
    const onEnd = () => setAppDragging(false);
    document.addEventListener("dragstart", onStart);
    document.addEventListener("dragend", onEnd);
    document.addEventListener("drop", onEnd);
    return () => {
      document.removeEventListener("dragstart", onStart);
      document.removeEventListener("dragend", onEnd);
      document.removeEventListener("drop", onEnd);
    };
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    function onDown(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addOpen]);

  function persist(next: Entry[]) {
    startTransition(() => {
      saveSpaceLayout(
        next.map((e) => ({
          type: e.type,
          id: e.type === "folder" ? e.folder.id : e.widget.id,
          cell: e.cell,
        })),
      );
    });
  }

  async function add(key: "folder" | WidgetKind) {
    setAddOpen(false);
    const used = new Set(entries.map((e) => e.cell));
    let cell = 0;
    while (used.has(cell)) cell++;
    const entry: Entry =
      key === "folder"
        ? { key: nextKey(), cell, type: "folder", folder: await createFolder() }
        : { key: nextKey(), cell, type: "widget", widget: await createWidget(key) };
    const next = [...entries, entry];
    setEntries(next);
    persist(next);
  }

  function removeEntry(key: string) {
    setEntries((cur) => {
      const next = cur.filter((x) => x.key !== key);
      persist(next);
      return next;
    });
  }

  function onDragStart(e: DragEvent, key: string) {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    dragKeyRef.current = key;
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
  }

  function onOverCell(e: DragEvent, cell: number) {
    if (!dragKeyRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropCellRef.current !== cell) {
      dropCellRef.current = cell;
      setDropCell(cell);
    }
  }

  function endDrag() {
    dragKeyRef.current = null;
    dropCellRef.current = null;
    setDragKey(null);
    setDropCell(null);
  }

  function onDropCell(e: DragEvent, cell: number) {
    const dk = dragKeyRef.current;
    if (dk == null) return; // no es nuestro drag (p. ej. un item de carpeta) — no interferir
    e.preventDefault();
    e.stopPropagation();
    const dragged = entries.find((x) => x.key === dk);
    if (!dragged || dragged.cell === cell) return endDrag();
    const occupant = entries.find((x) => x.key !== dk && x.cell === cell);
    const next = entries.map((x) => {
      if (x.key === dk) return { ...x, cell };
      if (occupant && x.key === occupant.key) return { ...x, cell: dragged.cell };
      return x;
    });
    setEntries(next);
    persist(next);
    endDrag();
  }

  const maxCell = entries.reduce((m, e) => Math.max(m, e.cell), -1);
  const rows = Math.max(1, Math.ceil((maxCell + 1) / COLS) + (dragKey ? 1 : 0));
  const grid: (Entry | null)[] = Array.from({ length: rows * COLS }, () => null);
  for (const e of entries) if (e.cell < grid.length) grid[e.cell] = e;

  return (
    <section className="hub-reveal flex flex-col gap-3.5" style={{ animationDelay: "40ms" }}>
      <div className="flex items-center justify-between gap-3">
        <Label>Tu espacio</Label>
        <div ref={addRef} className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] pl-2.5 pr-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
          >
            <span aria-hidden className="text-base leading-none">
              +
            </span>
            Añadir
          </button>
          {addOpen && (
            <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-md">
              {ADD_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => add(o.key)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--border)] px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          Tu espacio está vacío. Usa <strong>+ Añadir</strong> para crear una carpeta o un widget.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          {grid.map((entry, cell) =>
            entry ? (
              <div
                key={entry.key}
                draggable
                onDragStart={(e) => onDragStart(e, entry.key)}
                onDragEnd={endDrag}
                onDragOver={(e) => onOverCell(e, cell)}
                onDrop={(e) => onDropCell(e, cell)}
                className="rounded-[20px] transition-shadow"
                style={{
                  opacity: dragKey === entry.key ? 0.4 : undefined,
                  boxShadow:
                    dropCell === cell && dragKey !== entry.key
                      ? "0 0 0 2px var(--brand-water)"
                      : undefined,
                }}
              >
                {entry.type === "folder" ? (
                  <SpaceFolder
                    folder={entry.folder}
                    apps={apps}
                    appDragging={appDragging}
                    onDeleted={() => removeEntry(entry.key)}
                  />
                ) : (
                  <SpaceWidget widget={entry.widget} onDeleted={() => removeEntry(entry.key)} />
                )}
              </div>
            ) : (
              <div
                key={`empty-${cell}`}
                onDragOver={(e) => onOverCell(e, cell)}
                onDrop={(e) => onDropCell(e, cell)}
                className="hidden rounded-[20px] transition-colors md:block"
                style={{
                  // Sin arrastre no ocupa alto: una fila con todo colapsado se queda
                  // a la altura de la tarjeta, aunque tenga huecos al lado.
                  minHeight: dragKey ? MIN_CELL_H : 0,
                  border: dragKey ? "2px dashed var(--border)" : undefined,
                  borderColor: dropCell === cell ? "var(--brand-water)" : undefined,
                  background:
                    dropCell === cell
                      ? "color-mix(in srgb, var(--brand-water) 8%, transparent)"
                      : undefined,
                }}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
