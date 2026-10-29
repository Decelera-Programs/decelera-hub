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
  "rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_70%,transparent)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-shadow focus:border-[var(--brand-water)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-water)_22%,transparent)]";
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
      className="modal-backdrop fixed inset-0 z-[200] grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel flex w-full max-w-md flex-col gap-3 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="page-title text-2xl tracking-tight text-[var(--text-primary)]">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
