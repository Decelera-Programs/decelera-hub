"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export const fieldCls =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-water)]";
export const labelCls =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";

/** Diálogo modal centrado, renderizado en un portal a `document.body`. */
export function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--brand-night) 45%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
