"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_PAGES, currentPage } from "@/lib/pages";

/** Menú de arriba a la izquierda para saltar entre las páginas del hub. */
export function PageSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = currentPage(pathname);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] pl-2 pr-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-water)]"
      >
        <GridIcon />
        <span className="max-w-[130px] truncate">{current.label}</span>
        <span aria-hidden className="text-[10px] text-[var(--text-muted)]">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-md"
        >
          {HUB_PAGES.map((p) => {
            const on = p.key === current.key;
            return (
              <Link
                key={p.key}
                href={p.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--row-hover)]"
                style={{
                  color: on ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {p.label}
                {on && (
                  <span aria-hidden className="ml-auto text-[10px] text-[var(--brand-water)]">
                    ●
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="currentColor" aria-hidden>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.3" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.3" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.3" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.3" />
    </svg>
  );
}
