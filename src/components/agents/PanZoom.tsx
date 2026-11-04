"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const MIN_K = 0.4;
const MAX_K = 2.5;

type View = { x: number; y: number; k: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Lienzo arrastrable con zoom, estilo n8n: arrastrar con el ratón/dedo mueve, Ctrl+rueda (o pellizco
 * en trackpad) hace zoom hacia el cursor, y dos dedos pellizcan en táctil. La rueda sin Ctrl no se
 * captura, así la página sigue haciendo scroll. El contenido conserva su tamaño real (`width`×`height`).
 */
export function PanZoom({
  width,
  height,
  children,
  viewportClassName = "h-[320px] sm:h-[380px]",
}: {
  width: number;
  height: number;
  children: ReactNode;
  /** Alto del visor (por defecto el del diagrama de Agentes). */
  viewportClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number } | null>(null);

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K);
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  }, []);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const k = clamp(Math.min(el.clientWidth / width, el.clientHeight / height), MIN_K, 1);
    setView({ k, x: (el.clientWidth - width * k) / 2, y: (el.clientHeight - height * k) / 2 });
  }, [width, height]);

  // Listener no pasivo para poder bloquear el zoom del navegador con Ctrl+rueda.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.01));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onPointerDown(e: React.PointerEvent) {
    // Elementos clicables dentro del lienzo (marcados con data-nopan): sin capturar el puntero, o el clic
    // no les llegaría.
    if ((e.target as HTMLElement).closest("[data-nopan]")) return;
    ref.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = ref.current!.getBoundingClientRect();
      zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, dist / pinch.current.dist);
      pinch.current = { dist };
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  }

  const btn =
    "grid h-7 w-7 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]";

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`relative ${viewportClassName} w-full touch-none select-none overflow-hidden rounded-2xl`}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            width,
            height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
          }}
        >
          {children}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className={btn} aria-label="Alejar" onClick={() => zoomAt(ref.current!.clientWidth / 2, ref.current!.clientHeight / 2, 1 / 1.25)}>−</button>
        <button type="button" className={btn} aria-label="Acercar" onClick={() => zoomAt(ref.current!.clientWidth / 2, ref.current!.clientHeight / 2, 1.25)}>+</button>
        <button type="button" className={btn} aria-label="Ajustar a la vista" onClick={fit}>⤢</button>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 hidden text-[11px] text-[var(--text-muted)] sm:block">
        Arrastra para mover · Ctrl + rueda para zoom
      </p>
    </div>
  );
}
