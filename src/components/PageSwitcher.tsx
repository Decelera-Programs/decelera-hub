"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_PAGES, currentPage } from "@/lib/pages";

/** Navegación entre las páginas del hub, en línea (centrada en la cabecera). */
export function PageSwitcher() {
  const pathname = usePathname();
  const current = currentPage(pathname);

  return (
    <nav className="flex items-center gap-2">
      {HUB_PAGES.map((p) => {
        const on = p.key === current.key;
        return (
          <Link
            key={p.key}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--row-hover)]"
            style={{
              color: on ? "var(--text-primary)" : "var(--text-muted)",
              ...(on
                ? { background: "color-mix(in srgb, var(--brand-water) 14%, transparent)" }
                : {}),
            }}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
