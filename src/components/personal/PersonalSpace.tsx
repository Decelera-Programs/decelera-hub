"use client";

import { type DragEvent, useEffect, useRef, useState, useTransition } from "react";
import type { HubApp } from "@/lib/apps";
import type { Folder, Widget, WidgetKind } from "@/lib/hub";
import { createFolder, createWidget, reorderSpace } from "@/app/actions";
import { Label } from "@/components/HubPrimitives";
import { SpaceFolder } from "./SpaceFolder";
import { SpaceWidget } from "./SpaceWidget";

type Entry =
  | { type: "folder"; id: string; folder: Folder }
  | { type: "widget"; id: string; widget: Widget };

function build(folders: Folder[], widgets: Widget[]): Entry[] {
  const merged = [
    ...folders.map((f) => ({ e: { type: "folder", id: f.id, folder: f } as Entry, p: f.position })),
    ...widgets.map((w) => ({ e: { type: "widget", id: w.id, widget: w } as Entry, p: w.position })),
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
  // El estado local es la fuente de verdad en sesión; los server actions de aquí no revalidan,
  // así que basta con sembrar al montar. Una recarga real remonta el componente.
  const [entries, setEntries] = useState<Entry[]>(() => build(folders, widgets));
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [appDragging, setAppDragging] = useState(false);
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
      reorderSpace(next.map((e) => ({ type: e.type, id: e.id })));
    });
  }

  async function add(key: "folder" | WidgetKind) {
    setAddOpen(false);
    if (key === "folder") {
      const f = await createFolder();
      setEntries((e) => [...e, { type: "folder", id: f.id, folder: f }]);
    } else {
      const w = await createWidget(key);
      setEntries((e) => [...e, { type: "widget", id: w.id, widget: w }]);
    }
  }

  function removeEntry(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
  }

  function onDragStart(e: DragEvent, id: string) {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
      return;
    }
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: DragEvent, overId: string) {
    // Solo reaccionamos si es un reorden de carpeta/widget en curso; si no (p. ej. un item
    // arrastrado fuera de su carpeta), dejamos que el drop caiga "en el vacío".
    if (!dragId) return;
    e.preventDefault();
    if (dragId === overId) return;
    setEntries((cur) => {
      const fromIdx = cur.findIndex((x) => x.id === dragId);
      const overIdx = cur.findIndex((x) => x.id === overId);
      if (fromIdx < 0 || overIdx < 0) return cur;
      const next = cur.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
  }

  function onDragEnd() {
    setDragId(null);
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
              key={entry.id}
              draggable
              onDragStart={(e) => onDragStart(e, entry.id)}
              onDragOver={(e) => onDragOver(e, entry.id)}
              onDragEnd={onDragEnd}
              className={dragId === entry.id ? "opacity-40" : undefined}
            >
              {entry.type === "folder" ? (
                <SpaceFolder
                  folder={entry.folder}
                  apps={apps}
                  appDragging={appDragging}
                  onDeleted={() => removeEntry(entry.id)}
                />
              ) : (
                <SpaceWidget widget={entry.widget} onDeleted={() => removeEntry(entry.id)} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
