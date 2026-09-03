"use client";

import { type DragEvent, useEffect, useRef, useState, useTransition } from "react";
import type { HubApp } from "@/lib/apps";
import type { Folder, Widget, WidgetKind } from "@/lib/hub";
import { createFolder, createWidget, saveSpaceLayout } from "@/app/actions";
import { Label } from "@/components/HubPrimitives";
import { SpaceFolder } from "./SpaceFolder";
import { SpaceWidget } from "./SpaceWidget";

// Cada celda de la rejilla es un elemento: una carpeta o un widget. Se reordena
// arrastrando, estilo pantalla de inicio del móvil: los demás se apartan y, al
// tirar hacia abajo, aparece una fila nueva donde soltar.
type Entry =
  | { key: string; type: "folder"; folder: Folder }
  | { key: string; type: "widget"; widget: Widget };

let KEY = 0;
const nextKey = () => `e${KEY++}`;

function build(folders: Folder[], widgets: Widget[]): Entry[] {
  const merged = [
    ...folders.map((f) => ({ e: { key: nextKey(), type: "folder", folder: f } as Entry, p: f.position })),
    ...widgets.map((w) => ({ e: { key: nextKey(), type: "widget", widget: w } as Entry, p: w.position })),
  ];
  merged.sort((a, b) => a.p - b.p);
  return merged.map((m) => m.e);
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
  // Espejo síncrono: los handlers de DnD se disparan antes de que React re-renderice.
  const dragKeyRef = useRef<string | null>(null);
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

  function persistOrder(next: Entry[]) {
    startTransition(() => {
      saveSpaceLayout(
        next.map((e) =>
          e.type === "folder"
            ? { type: "folder" as const, id: e.folder.id }
            : { type: "widgets" as const, ids: [e.widget.id] },
        ),
      );
    });
  }

  async function add(key: "folder" | WidgetKind) {
    setAddOpen(false);
    const next = [...entries];
    if (key === "folder") {
      next.push({ key: nextKey(), type: "folder", folder: await createFolder() });
    } else {
      next.push({ key: nextKey(), type: "widget", widget: await createWidget(key) });
    }
    setEntries(next);
    // Renumera 0..n ya, para que dos creaciones en el mismo segundo no compartan `position`.
    persistOrder(next);
  }

  function removeEntry(key: string) {
    setEntries((cur) => {
      const next = cur.filter((x) => x.key !== key);
      persistOrder(next);
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

  function moveDragged(toIndex: (cur: Entry[]) => number) {
    const dk = dragKeyRef.current;
    if (!dk) return;
    setEntries((cur) => {
      const from = cur.findIndex((x) => x.key === dk);
      let to = toIndex(cur);
      if (from < 0 || to < 0) return cur;
      to = Math.min(to, cur.length - 1);
      if (from === to) return cur;
      const next = cur.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onOverCell(e: DragEvent, overKey: string) {
    if (!dragKeyRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragKeyRef.current === overKey) return;
    moveDragged((cur) => cur.findIndex((x) => x.key === overKey));
  }

  function onOverEnd(e: DragEvent) {
    if (!dragKeyRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    moveDragged((cur) => cur.length - 1);
  }

  function endDrag() {
    if (!dragKeyRef.current) return;
    dragKeyRef.current = null;
    setDragKey(null);
    setEntries((cur) => {
      persistOrder(cur);
      return cur;
    });
  }

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.key}
              draggable
              onDragStart={(e) => onDragStart(e, entry.key)}
              onDragOver={(e) => onOverCell(e, entry.key)}
              onDrop={(e) => {
                e.preventDefault();
                endDrag();
              }}
              onDragEnd={endDrag}
              className={dragKey === entry.key ? "opacity-40" : undefined}
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
          ))}

          {dragKey && (
            <div
              onDragOver={onOverEnd}
              onDrop={(e) => {
                e.preventDefault();
                endDrag();
              }}
              className="grid min-h-[140px] place-items-center rounded-[20px] border-2 border-dashed border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] transition-colors"
            >
              Soltar aquí ↓
            </div>
          )}
        </div>
      )}
    </section>
  );
}
