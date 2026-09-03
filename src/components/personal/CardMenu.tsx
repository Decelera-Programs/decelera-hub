"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Menú "⋮" compartido por las tarjetas de Tu espacio (carpetas y widgets).
 * Se renderiza en un portal a `document.body` con `position: fixed`: así no
 * hereda stacking context ni color de la tarjeta que hay debajo — se ve como
 * un panel flotante sólido, no translúcido.
 */
export function CardMenu({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) onClose?.();
    wasOpen.current = open;
  }, [open, onClose]);

  const measure = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, []);
  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    measure();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-6 w-5 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
      >
        ⋮
      </button>
      {open &&
        pos != null &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            className="fixed z-[999] w-44 overflow-hidden rounded-xl py-1"
            style={{
              top: pos.top,
              right: pos.right,
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              boxShadow:
                "0 18px 44px -12px color-mix(in srgb, var(--brand-night) 55%, transparent), 0 3px 10px -3px color-mix(in srgb, var(--brand-night) 35%, transparent)",
            }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  );
}
