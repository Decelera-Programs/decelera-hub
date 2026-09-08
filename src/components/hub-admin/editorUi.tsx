"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

/** Botón cuadrado de acción admin (editar / mover / …). Compartido por la home y el árbol. */
export function AdminBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="relative z-10 grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:border-[var(--border)]"
    >
      {children}
    </button>
  );
}

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
