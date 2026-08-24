"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

const BASE_WIDTH = 2400;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function CustomerJourneyButton() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function openModal() {
    setZoom(1);
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--row-hover)]"
      >
        <span aria-hidden>🗺️</span>
        Review the Customer Journey to Investment here
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer Journey to Investment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card flex max-h-[90vh] w-full max-w-[95vw] flex-col gap-3 p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Customer Journey to Investment
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
                  aria-label="Zoom out"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]"
                >
                  −
                </button>
                <span className="w-12 text-center text-xs tabular-nums text-[var(--text-secondary)]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
                  aria-label="Zoom in"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
                >
                  Reset
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ background: "var(--page)" }}>
              <img
                src="/customer-journey.png"
                alt="Customer Journey to Investment — dealflow diagram"
                style={{ width: BASE_WIDTH * zoom, maxWidth: "none", height: "auto" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
