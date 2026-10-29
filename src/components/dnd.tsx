"use client";

import { createContext, type DragEvent, type ReactNode, useContext, useMemo, useState } from "react";

/** Lo que se arrastra y lo que se puede soltar encima comparten forma: `kind` + `id`. */
export type DragItem = { kind: "section" | "subfolder" | "card"; id: string };

type Ctx = {
  enabled: boolean;
  dragging: DragItem | null;
  setDragging: (d: DragItem | null) => void;
  onDrop: (item: DragItem, target: DragItem) => void;
};

const DndCtx = createContext<Ctx>({
  enabled: false,
  dragging: null,
  setDragging: () => {},
  onDrop: () => {},
});

export function DndProvider({
  enabled,
  onDrop,
  children,
}: {
  enabled: boolean;
  onDrop: Ctx["onDrop"];
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState<DragItem | null>(null);
  const value = useMemo(() => ({ enabled, dragging, setDragging, onDrop }), [enabled, dragging, onDrop]);
  return <DndCtx.Provider value={value}>{children}</DndCtx.Provider>;
}

export function useDragging() {
  const { enabled, dragging } = useContext(DndCtx);
  return enabled ? dragging : null;
}

/** Qué puede soltarse sobre qué: las secciones se reordenan; subcarpetas y tarjetas se mueven. */
function accepts(drag: DragItem, target: DragItem) {
  if (drag.kind === target.kind && drag.id === target.id) return false;
  if (target.kind === "section") return true;
  if (target.kind === "subfolder") return drag.kind !== "section";
  return drag.kind === "card";
}

/** Props de arrastre + zona de suelta para un elemento. Sin modo Editar no hace nada. */
export function useDndItem(self: DragItem, { draggable = true }: { draggable?: boolean } = {}) {
  const { enabled, dragging, setDragging, onDrop } = useContext(DndCtx);
  const [over, setOver] = useState(false);
  if (!enabled) return { props: {}, over: false, isDragging: false };

  const valid = !!dragging && accepts(dragging, self);
  const props = {
    draggable,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", self.id);
      setDragging(self);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(false);
    },
    onDragOver: (e: DragEvent) => {
      if (!valid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!over) setOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
    },
    onDrop: (e: DragEvent) => {
      if (!valid || !dragging) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      setDragging(null);
      onDrop(dragging, self);
    },
  };
  return {
    props,
    over: over && valid,
    isDragging: dragging?.kind === self.kind && dragging.id === self.id,
  };
}

/** Feedback visual: tenue al arrastrar, anillo Water al estar encima. */
export function dndClass(state: { over: boolean; isDragging: boolean }) {
  return `${state.isDragging ? "opacity-40" : ""} ${state.over ? "ring-2 ring-[var(--brand-water)]" : ""}`;
}
