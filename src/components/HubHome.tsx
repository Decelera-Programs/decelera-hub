"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { COMING_SOON_SLOTS, type HubApp } from "@/lib/apps";
import { useHub } from "@/lib/useHub";
import { IconTile, Label, SearchField, Star } from "./HubPrimitives";
import { ComingSoonCard, ToolCard } from "./ToolCard";

const CATEGORY_TAB_LABEL: Record<string, string> = {
  Todos: "Todos",
  Dashboard: "Dashboards",
  Herramienta: "Herramientas",
  Datos: "Datos",
};

export function HubHome({ apps }: { apps: HubApp[] }) {
  const { query, setQuery, category, setCategory, categories, visible, counts, togglePin, pinnedTools } =
    useHub(apps);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showComingSoon = category === "Todos" && query.trim() === "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--page)] via-[var(--page)] to-[color-mix(in_srgb,var(--brand-water)_10%,var(--page))]">
      <header className="flex h-16 items-center gap-6 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_80%,transparent)] px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/decelera-mark.svg" alt="Decelera" className="h-7 w-7" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-base font-normal tracking-tight text-[var(--text-muted)]">Hub</span>
          </div>
        </div>
        <div className="flex flex-1 justify-center">
          <SearchField
            value={query}
            onChange={setQuery}
            shortcut
            placeholder="Buscar herramientas, dashboards…"
            className="h-[38px] w-full max-w-[420px]"
            inputRef={searchRef}
          />
        </div>
        <div className="w-[180px]" aria-hidden />
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 pb-14 pt-10">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-sea)]">
            Espacio de trabajo
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[42px]">
            Herramientas del equipo
          </h1>
          <p className="max-w-lg text-[15px] text-[var(--text-secondary)]">
            Punto de partida para todo lo que construimos en Decelera. {visible.length} módulo
            {visible.length === 1 ? "" : "s"} disponible{visible.length === 1 ? "" : "s"}.
          </p>
        </div>

        {pinnedTools.length > 0 && (
          <section className="flex flex-col gap-3.5">
            <Label>Accesos rápidos</Label>
            <div className="flex flex-wrap gap-2.5">
              {pinnedTools.map((t) => (
                <a
                  key={t.slug}
                  href={t.href}
                  {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex h-10 items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] pl-3 pr-4 transition-colors hover:border-[var(--brand-water)]"
                >
                  <IconTile category={t.category} initial={t.initial} size={22} />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t.title}</span>
                  <Star active />
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]">
          <div className="flex gap-1">
            {categories.map((c) => {
              const on = c === category;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: on ? "var(--brand-water)" : "transparent",
                    color: on ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {CATEGORY_TAB_LABEL[c] ?? c}{" "}
                  <span className="font-medium text-[var(--text-muted)]">{counts[c] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((app) => (
            <ToolCard key={app.slug} app={app} pinned={app.pinned} onTogglePin={togglePin} />
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-[var(--text-muted)]">
              Sin resultados para &ldquo;{query}&rdquo;.
            </p>
          )}
          {showComingSoon &&
            Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => <ComingSoonCard key={i} />)}
        </div>
      </main>
    </div>
  );
}
