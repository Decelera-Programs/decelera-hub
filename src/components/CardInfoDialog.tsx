"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { HubApp } from "@/lib/apps";
import { IconTile, StatusPill } from "./HubPrimitives";

/**
 * Detalle de una tarjeta del hub en un pop-up. La fila del árbol se mantiene compacta;
 * este diálogo aparece al pulsar el botón de info y muestra todo (descripción, etiqueta,
 * estado) sin ocupar espacio en la vista.
 */
export function CardInfoDialog({ card, onClose }: { card: HubApp; onClose: () => void }) {
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
        className="hub-reveal flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <IconTile category={card.category} initial={card.initial} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {card.meta ?? card.category}
              </p>
              <StatusPill status={card.status} />
            </div>
            <h3 className="text-lg font-semibold leading-tight text-[var(--text-primary)]">
              {card.title}
            </h3>
          </div>
        </div>

        {card.description && (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{card.description}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
          >
            Cerrar
          </button>
          <Link
            href={card.href}
            {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            onClick={onClose}
            className="rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-sm font-semibold text-white"
          >
            Abrir {card.external ? "↗" : "→"}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
