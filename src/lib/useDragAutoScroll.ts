"use client";

import { useEffect } from "react";

/**
 * Durante un arrastre nativo (HTML5 DnD) la ventana no hace scroll sola: si el
 * destino (p. ej. una carpeta de "Tu espacio") queda fuera de vista, no hay forma
 * de llegar. Esto lo arregla: mientras se arrastra algo y el puntero entra en la
 * franja superior/inferior del viewport, la página se desplaza en esa dirección.
 */
export function useDragAutoScroll(edge = 90, maxSpeed = 24) {
  useEffect(() => {
    let raf = 0;
    let vy = 0;
    let lastOver = 0;

    const tick = () => {
      // Si hace rato que no llega un `dragover`, el arrastre acabó fuera de foco: paramos.
      if (vy !== 0 && Date.now() - lastOver < 400) {
        window.scrollBy(0, vy);
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onDragOver = (e: DragEvent) => {
      lastOver = Date.now();
      const y = e.clientY;
      const h = window.innerHeight;
      if (y < edge) vy = -Math.ceil(((edge - y) / edge) * maxSpeed);
      else if (y > h - edge) vy = Math.ceil(((y - (h - edge)) / edge) * maxSpeed);
      else vy = 0;
      if (vy !== 0 && !raf) raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      vy = 0;
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
