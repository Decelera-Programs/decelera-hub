"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HUB_PAGES, currentPage } from "@/lib/pages";

/** Navegación entre las páginas del hub, en línea (centrada en la cabecera). */
export function PageSwitcher() {
  const pathname = usePathname();
  const current = currentPage(pathname);
  const navRef = useRef<HTMLElement>(null);

  // En móvil no caben las 5 páginas: el selector se desliza y la activa queda a la vista.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current.key]);

  return (
    <nav
      ref={navRef}
      className="flex min-w-0 items-center gap-1 max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden sm:gap-2"
    >
      {HUB_PAGES.map((p) => {
        const on = p.key === current.key;
        return (
          <Link
            key={p.key}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className="nav-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold transition-colors hover:bg-[var(--row-hover)] sm:px-4 sm:py-1.5 sm:text-sm"
            style={{ color: on ? "var(--brand-sea)" : "var(--text-muted)" }}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
