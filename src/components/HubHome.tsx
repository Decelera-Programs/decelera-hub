"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
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

const EXTERNAL_LINKS: { name: string; href: string; icon: string }[] = [
  { name: "Attio", href: "https://app.attio.com", icon: "https://attio.com/favicon.ico" },
  { name: "Claude", href: "https://claude.ai", icon: "https://claude.ai/favicon.ico" },
];

function LinkFavicon({ name, icon, size }: { name: string; icon: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-[6px] bg-[var(--pill-neutral-bg)] text-xs font-bold text-[var(--text-secondary)]"
        style={{ width: size, height: size }}
      >
        {name[0]}
      </span>
    );
  }
  return (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-[6px]"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/** Panel vertical de accesos directos — vive en la columna izquierda sticky (desktop). */
function QuickLinksPanel() {
  return (
    <nav aria-label="Accesos directos" className="flex flex-col gap-2">
      <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Accesos directos
      </span>
      {EXTERNAL_LINKS.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-2 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-water)] hover:shadow-md"
        >
          <LinkFavicon name={l.name} icon={l.icon} size={22} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{l.name}</span>
          <span
            aria-hidden
            className="ml-auto text-xs text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
          >
            ↗
          </span>
        </a>
      ))}
    </nav>
  );
}

/** Versión compacta en fila — para pantallas sin columna lateral. */
function QuickLinksInline() {
  return (
    <nav aria-label="Accesos directos" className="flex flex-wrap items-center gap-2 lg:hidden">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Accesos directos
      </span>
      {EXTERNAL_LINKS.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] py-1.5 pl-2 pr-3 transition-all hover:border-[var(--brand-water)]"
        >
          <LinkFavicon name={l.name} icon={l.icon} size={18} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{l.name}</span>
        </a>
      ))}
    </nav>
  );
}

export function HubHome({ apps }: { apps: HubApp[] }) {
  const {
    query,
    setQuery,
    category,
    setCategory,
    categories,
    counts,
    groups,
    visibleCount,
    totalCount,
    togglePin,
    pinnedTools,
  } = useHub(apps);
  const searchRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);

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

  // La barra superior está anclada (sticky); al hacer scroll "aterriza" sobre el contenido:
  // gana fondo sólido, borde y sombra. Arriba del todo queda plana, sin materia.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtering = query.trim() !== "" || category !== "Todos";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--page)] via-[var(--page)] to-[color-mix(in_srgb,var(--brand-water)_10%,var(--page))]">
      <header
        className="sticky top-0 z-20 flex h-16 items-center gap-6 px-8 transition-all duration-300 ease-out"
        style={{
          background: scrolled
            ? "color-mix(in srgb, var(--surface-1) 92%, transparent)"
            : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
          boxShadow: scrolled ? "0 10px 30px -16px color-mix(in srgb, var(--brand-night) 45%, transparent)" : "none",
        }}
      >
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

      <main className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 pb-16 pt-10 lg:gap-10 lg:px-8">
        <aside className="sticky top-28 hidden h-fit w-[172px] shrink-0 lg:block">
          <QuickLinksPanel />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-10">
        <QuickLinksInline />
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

        {pinnedTools.length > 0 && (
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

        <div className="hub-reveal flex items-center justify-between gap-4 border-b border-[var(--border)]" style={{ animationDelay: "90ms" }}>
          <div className="flex gap-1">
            {categories.map((c) => {
              const on = c === category;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="relative whitespace-nowrap px-3.5 pb-3 pt-2 text-sm font-semibold transition-colors"
                  style={{ color: on ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {CATEGORY_TAB_LABEL[c] ?? c}{" "}
                  <span className="font-medium text-[var(--text-muted)]">{counts[c] ?? 0}</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all duration-200"
                    style={{
                      background: "var(--brand-water)",
                      opacity: on ? 1 : 0,
                      transform: on ? "scaleX(1)" : "scaleX(0.4)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {groups.map((group, gi) => {
          const isLast = gi === groups.length - 1;
          return (
            <section
              key={group.id}
              className="hub-reveal flex flex-col gap-4"
              style={{ animationDelay: `${120 + gi * 90}ms` }}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-5 w-1 rounded-full" style={{ background: group.accent }} />
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.apps.map((app, ci) => (
                  <ToolCard
                    key={app.slug}
                    app={app}
                    pinned={app.pinned}
                    onTogglePin={togglePin}
                    revealDelay={150 + gi * 90 + ci * 55}
                  />
                ))}
                {isLast &&
                  !filtering &&
                  Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => (
                    <ComingSoonCard key={i} revealDelay={150 + gi * 90 + group.apps.length * 55 + i * 55} />
                  ))}
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <p className="hub-reveal py-16 text-center text-sm text-[var(--text-muted)]">
            Sin resultados{query.trim() ? ` para “${query}”` : " en esta categoría"}.
          </p>
        )}

        {filtering && groups.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            {visibleCount} de {totalCount} módulos.
          </p>
        )}
        </div>
      </main>
    </div>
  );
}
