"use client";

import { type DragEvent, useEffect, useRef, useState, useTransition } from "react";
import type { HubApp } from "@/lib/apps";
import type { Folder, Widget, WidgetKind } from "@/lib/hub";
import { createFolder, createWidget, saveSpaceLayout } from "@/app/actions";
import { Label } from "@/components/HubPrimitives";
import { SpaceFolder } from "./SpaceFolder";
import { SpaceWidget } from "./SpaceWidget";

// Una ranura de la rejilla: una carpeta, o un grupo de widgets (1 = suelto, 2+ = pila vertical).
type FolderSlot = { sid: string; kind: "folder"; folder: Folder };
type WidgetsSlot = { sid: string; kind: "widgets"; widgets: Widget[] };
type Slot = FolderSlot | WidgetsSlot;

let SID = 0;
const nextSid = () => `slot-${SID++}`;

function build(folders: Folder[], widgets: Widget[]): Slot[] {
  const byPos = new Map<number, Widget[]>();
  for (const w of widgets) {
    const arr = byPos.get(w.position) ?? [];
    arr.push(w);
    byPos.set(w.position, arr);
  }
  const rows: { pos: number; slot: Slot }[] = [];
  for (const f of folders) rows.push({ pos: f.position, slot: { sid: nextSid(), kind: "folder", folder: f } });
  for (const [pos, ws] of byPos) {
    ws.sort((a, b) => a.stackOrder - b.stackOrder);
    rows.push({ pos, slot: { sid: nextSid(), kind: "widgets", widgets: ws } });
  }
  rows.sort((a, b) => a.pos - b.pos);
  return rows.map((r) => r.slot);
}

const ADD_OPTIONS: { key: "folder" | WidgetKind; label: string }[] = [
  { key: "folder", label: "Nueva carpeta" },
  { key: "note", label: "Nota" },
  { key: "links", label: "Lista de enlaces" },
  { key: "todo", label: "To-do" },
];

type DragKind = "folder" | "widget" | "stack";
type Drop = { sid: string; pos: "before" | "under" };

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
  const [slots, setSlots] = useState<Slot[]>(() => build(folders, widgets));
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [appDragging, setAppDragging] = useState(false);
  const [dragKind, setDragKind] = useState<DragKind | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
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

  function persist(next: Slot[]) {
    startTransition(() => {
      saveSpaceLayout(
        next.map((s) =>
          s.kind === "folder"
            ? { type: "folder" as const, id: s.folder.id }
            : { type: "widgets" as const, ids: s.widgets.map((w) => w.id) },
        ),
      );
    });
  }

  async function add(key: "folder" | WidgetKind) {
    setAddOpen(false);
    const next: Slot[] = [...slots];
    if (key === "folder") {
      next.push({ sid: nextSid(), kind: "folder", folder: await createFolder() });
    } else {
      next.push({ sid: nextSid(), kind: "widgets", widgets: [await createWidget(key)] });
    }
    setSlots(next);
    // Renumera posiciones 0..n ya, para que dos creaciones en el mismo segundo no
    // acaben compartiendo `position` (y renderizándose como pila al recargar).
    persist(next);
  }

  function removeFolder(id: string) {
    setSlots((s) => s.filter((x) => !(x.kind === "folder" && x.folder.id === id)));
  }
  function removeWidget(id: string) {
    setSlots((s) =>
      s
        .map((x) => (x.kind === "widgets" ? { ...x, widgets: x.widgets.filter((w) => w.id !== id) } : x))
        .filter((x) => x.kind !== "widgets" || x.widgets.length > 0),
    );
  }

  function clearDrag() {
    setDragKind(null);
    setDragId(null);
    setDrop(null);
  }

  function beginDrag(e: DragEvent, kind: DragKind, id: string) {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDragKind(kind);
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function overSlot(e: DragEvent, slot: Slot) {
    if (!dragKind) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - r.top) / Math.max(r.height, 1);
    const canStack = slot.kind === "widgets" && dragKind !== "folder";
    const pos: Drop["pos"] = canStack && rel > 0.6 ? "under" : "before";
    setDrop((d) => (d && d.sid === slot.sid && d.pos === pos ? d : { sid: slot.sid, pos }));
  }

  function overEnd(e: DragEvent) {
    if (!dragKind) return;
    e.preventDefault();
    setDrop((d) => (d && d.sid === "__end__" ? d : { sid: "__end__", pos: "before" }));
  }

  function commitDrop() {
    const d = drop;
    if (!d || !dragKind || !dragId) {
      clearDrag();
      return;
    }

    const cur: Slot[] = slots.map((s) =>
      s.kind === "widgets" ? { ...s, widgets: [...s.widgets] } : { ...s },
    );

    // 1. Sacar la unidad arrastrada de donde esté.
    let carriedFolder: Folder | null = null;
    let carriedWidgets: Widget[] = [];

    if (dragKind === "folder") {
      const i = cur.findIndex((s) => s.kind === "folder" && s.folder.id === dragId);
      if (i < 0) return clearDrag();
      carriedFolder = (cur[i] as FolderSlot).folder;
      cur.splice(i, 1);
    } else if (dragKind === "stack") {
      const i = cur.findIndex((s) => s.kind === "widgets" && s.sid === dragId);
      if (i < 0) return clearDrag();
      carriedWidgets = (cur[i] as WidgetsSlot).widgets;
      cur.splice(i, 1);
    } else {
      const i = cur.findIndex((s) => s.kind === "widgets" && s.widgets.some((w) => w.id === dragId));
      if (i < 0) return clearDrag();
      const slot = cur[i] as WidgetsSlot;
      const w = slot.widgets.find((x) => x.id === dragId);
      if (!w) return clearDrag();
      carriedWidgets = [w];
      slot.widgets = slot.widgets.filter((x) => x.id !== dragId);
      if (slot.widgets.length === 0) cur.splice(i, 1);
    }

    const makeSlot = (): Slot =>
      carriedFolder
        ? { sid: nextSid(), kind: "folder", folder: carriedFolder }
        : { sid: nextSid(), kind: "widgets", widgets: carriedWidgets };

    // 2. Insertar en el destino.
    if (d.sid === "__end__") {
      cur.push(makeSlot());
    } else {
      const t = cur.findIndex((s) => s.sid === d.sid);
      if (t < 0) return clearDrag(); // el destino era la propia unidad arrastrada → sin cambios
      const target = cur[t];
      if (d.pos === "under" && target.kind === "widgets" && !carriedFolder) {
        target.widgets.push(...carriedWidgets);
      } else {
        cur.splice(t, 0, makeSlot());
      }
    }

    setSlots(cur);
    persist(cur);
    clearDrag();
  }

  function slotDimmed(slot: Slot): boolean {
    if (dragKind === "folder") return slot.kind === "folder" && slot.folder.id === dragId;
    if (dragKind === "stack") return slot.sid === dragId;
    return (
      slot.kind === "widgets" && slot.widgets.length === 1 && slot.widgets[0]?.id === dragId
    );
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

      {slots.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--border)] px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          Tu espacio está vacío. Usa <strong>+ Añadir</strong> para crear una carpeta o un widget.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
            <SlotView
              key={slot.sid}
              slot={slot}
              apps={apps}
              appDragging={appDragging}
              dimmed={slotDimmed(slot)}
              dragWidgetId={dragKind === "widget" ? dragId : null}
              hint={drop && drop.sid === slot.sid ? drop.pos : null}
              onBeginDrag={beginDrag}
              onOverSlot={overSlot}
              onCommitDrop={commitDrop}
              onDragEnd={clearDrag}
              onFolderDeleted={removeFolder}
              onWidgetDeleted={removeWidget}
            />
          ))}
          {dragKind && (
            <div
              onDragOver={overEnd}
              onDrop={(e) => {
                e.preventDefault();
                commitDrop();
              }}
              className="min-h-[64px] rounded-2xl border-2 border-dashed transition-colors"
              style={{
                borderColor: drop?.sid === "__end__" ? "var(--brand-water)" : "var(--border)",
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SlotView({
  slot,
  apps,
  appDragging,
  dimmed,
  dragWidgetId,
  hint,
  onBeginDrag,
  onOverSlot,
  onCommitDrop,
  onDragEnd,
  onFolderDeleted,
  onWidgetDeleted,
}: {
  slot: Slot;
  apps: HubApp[];
  appDragging: boolean;
  dimmed: boolean;
  dragWidgetId: string | null;
  hint: "before" | "under" | null;
  onBeginDrag: (e: DragEvent, kind: DragKind, id: string) => void;
  onOverSlot: (e: DragEvent, slot: Slot) => void;
  onCommitDrop: () => void;
  onDragEnd: () => void;
  onFolderDeleted: (id: string) => void;
  onWidgetDeleted: (id: string) => void;
}) {
  return (
    <div
      className="relative"
      style={{ opacity: dimmed ? 0.4 : undefined }}
      onDragOver={(e) => onOverSlot(e, slot)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCommitDrop();
      }}
    >
      {hint === "before" && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-2 left-0 right-0 h-1 rounded-full"
          style={{ background: "var(--brand-water)" }}
        />
      )}

      {slot.kind === "folder" ? (
        <div
          draggable
          onDragStart={(e) => onBeginDrag(e, "folder", slot.folder.id)}
          onDragEnd={onDragEnd}
        >
          <SpaceFolder
            folder={slot.folder}
            apps={apps}
            appDragging={appDragging}
            onDeleted={() => onFolderDeleted(slot.folder.id)}
          />
        </div>
      ) : slot.widgets.length === 1 ? (
        <div
          draggable
          onDragStart={(e) => onBeginDrag(e, "widget", slot.widgets[0]!.id)}
          onDragEnd={onDragEnd}
        >
          <SpaceWidget widget={slot.widgets[0]!} onDeleted={() => onWidgetDeleted(slot.widgets[0]!.id)} />
        </div>
      ) : (
        <div
          draggable
          onDragStart={(e) => onBeginDrag(e, "stack", slot.sid)}
          onDragEnd={onDragEnd}
          className="flex flex-col gap-4"
        >
          {slot.widgets.map((w) => (
            <div
              key={w.id}
              draggable
              onDragStart={(e) => onBeginDrag(e, "widget", w.id)}
              onDragEnd={onDragEnd}
              style={{ opacity: dragWidgetId === w.id ? 0.4 : undefined }}
            >
              <SpaceWidget widget={w} onDeleted={() => onWidgetDeleted(w.id)} />
            </div>
          ))}
        </div>
      )}

      {hint === "under" && (
        <div
          aria-hidden
          className="pointer-events-none mt-3 grid h-16 place-items-center rounded-2xl border-2 border-dashed text-xs font-semibold"
          style={{ borderColor: "var(--brand-water)", color: "var(--brand-water)" }}
        >
          Soltar aquí ▾
        </div>
      )}
    </div>
  );
}
