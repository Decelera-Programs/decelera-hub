"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { COMING_SOON_SLOTS, type HubApp } from "@/lib/apps";
import { useHub } from "@/lib/useHub";
import { IconTile, Label, SearchField, Star } from "./HubPrimitives";
import { ComingSoonCard, ToolCard } from "./ToolCard";

export function HubHome({ apps }: { apps: HubApp[] }) {
  const { query, setQuery, groups, visibleCount, totalCount, togglePin, pinnedTools } = useHub(apps);
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

  const searching = query.trim() !== "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--page)] via-[var(--page)] to-[color-mix(in_srgb,var(--brand-water)_10%,var(--page))]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_80%,transparent)] px-8 backdrop-blur-md">
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

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-8 pb-16 pt-10">
        <div className="hub-reveal flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-sea)]">
            Espacio de trabajo
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[42px]">
            Herramientas del equipo
          </h1>
          <p className="max-w-lg text-[15px] text-[var(--text-secondary)]">
            Punto de partida para todo lo que construimos en Decelera. {totalCount} módulo
            {totalCount === 1 ? "" : "s"}, organizados por área.
          </p>
        </div>

        {pinnedTools.length > 0 && !searching && (
          <section className="hub-reveal flex flex-col gap-3.5" style={{ animationDelay: "60ms" }}>
            <Label>Accesos rápidos</Label>
            <div className="flex flex-wrap gap-2.5">
              {pinnedTools.map((t) => (
                <a
                  key={t.slug}
                  href={t.href}
                  {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex h-10 items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] pl-3 pr-4 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-water)] hover:shadow-md"
                >
                  <IconTile category={t.category} initial={t.initial} size={22} />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t.title}</span>
                  <Star active />
                </a>
              ))}
            </div>
          </section>
        )}

        {groups.map((group, gi) => {
          const isLast = gi === groups.length - 1;
          return (
            <section
              key={group.id}
              className="hub-reveal flex flex-col gap-4"
              style={{ animationDelay: `${90 + gi * 90}ms` }}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-5 w-1 rounded-full"
                    style={{ background: group.accent }}
                  />
                  <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    {group.label}
                  </h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${group.accent} 14%, transparent)`,
                      color: group.accent,
                    }}
                  >
                    {group.apps.length}
                  </span>
                </div>
                <p className="pl-4 text-sm text-[var(--text-muted)]">{group.blurb}</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.apps.map((app, ci) => (
                  <ToolCard
                    key={app.slug}
                    app={app}
                    pinned={app.pinned}
                    onTogglePin={togglePin}
                    revealDelay={120 + gi * 90 + ci * 55}
                  />
                ))}
                {isLast &&
                  !searching &&
                  Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => (
                    <ComingSoonCard key={i} revealDelay={120 + gi * 90 + group.apps.length * 55 + i * 55} />
                  ))}
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <p className="hub-reveal py-16 text-center text-sm text-[var(--text-muted)]">
            Sin resultados para &ldquo;{query}&rdquo;.
          </p>
        )}

        {searching && groups.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            {visibleCount} de {totalCount} coinciden con &ldquo;{query}&rdquo;.
          </p>
        )}
      </main>
    </div>
  );
}
