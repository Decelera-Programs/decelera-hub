"use client";

import { useEffect } from "react";

/** Contenedor con scroll vertical más cercano al punto dado (o null si solo scrollea la página). */
function scrollableUnder(x: number, y: number): HTMLElement | null {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Durante un arrastre nativo (HTML5 DnD) nada hace scroll solo: si el destino
 * (p. ej. una tarjeta de "Tu espacio") queda fuera de vista, no hay forma de
 * llegar. Esto lo arregla: mientras se arrastra y el puntero entra en la franja
 * superior/inferior del contenedor con scroll bajo el ratón (o de la ventana si
 * no hay ninguno), ese contenedor se desplaza en esa dirección.
 */
export function useDragAutoScroll(edge = 90, maxSpeed = 24) {
  useEffect(() => {
    let raf = 0;
    let vy = 0;
    let lastOver = 0;
    let container: HTMLElement | null = null;

    const tick = () => {
      if (vy !== 0 && Date.now() - lastOver < 400) {
        if (container) container.scrollTop += vy;
        else window.scrollBy(0, vy);
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onDragOver = (e: DragEvent) => {
      lastOver = Date.now();
      container = scrollableUnder(e.clientX, e.clientY);

      let top: number;
      let bottom: number;
      if (container) {
        const r = container.getBoundingClientRect();
        top = r.top;
        bottom = r.bottom;
      } else {
        top = 0;
        bottom = window.innerHeight;
      }

      const y = e.clientY;
      if (y < top + edge) vy = -Math.ceil(((top + edge - y) / edge) * maxSpeed);
      else if (y > bottom - edge) vy = Math.ceil(((y - (bottom - edge)) / edge) * maxSpeed);
      else vy = 0;

      if (vy !== 0 && !raf) raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      vy = 0;
      container = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", stop);
    document.addEventListener("dragend", stop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", stop);
      document.removeEventListener("dragend", stop);
      stop();
    };
  }, [edge, maxSpeed]);
}
