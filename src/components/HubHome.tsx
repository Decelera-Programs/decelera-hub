"use client";

/* eslint-disable @next/next/no-img-element */
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import type { HubApp, Section } from "@/lib/apps";
import type { Folder, Widget } from "@/lib/hub";
import { createSection, reorderCards, reorderSections } from "@/app/actions";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import { useHub } from "@/lib/useHub";
import { AccountMenu, type AccountUser } from "./AccountMenu";
import { CardEditor } from "./hub-admin/CardEditor";
import { SectionEditor } from "./hub-admin/SectionEditor";
import { SearchField } from "./HubPrimitives";
import { PersonalSpace } from "./personal/PersonalSpace";
import { ToolCard } from "./ToolCard";

const CATEGORY_TAB_LABEL: Record<string, string> = {
  Todos: "Todos",
  Dashboard: "Dashboards",
  Herramienta: "Herramientas",
  Datos: "Datos",
};

type CardEditorState = { sectionId: string; card: HubApp | null };

export function HubHome({
  sections,
  apps,
  member,
  folders,
  widgets,
}: {
  sections: Section[];
  apps: HubApp[];
  member: AccountUser;
  folders: Folder[];
  widgets: Widget[];
}) {
  const { query, setQuery, category, setCategory, categories, counts, groups, filtering, visibleCount, totalCount } =
    useHub(apps, sections);
  const searchRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [cardEditor, setCardEditor] = useState<CardEditorState | null>(null);
  const [sectionEditor, setSectionEditor] = useState<Section | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [, startAdmin] = useTransition();
  useDragAutoScroll();

  const isAdmin = member.isAdmin;
  const canEdit = isAdmin && editMode && !filtering;

  // El interruptor de edición se recuerda entre recargas (solo tiene efecto para admin).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem("hub:editmode") === "1") setEditMode(true);
    } catch {
      // sin localStorage — se queda apagado
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function toggleEditMode() {
    setEditMode((v) => {
      const next = !v;
      try {
        localStorage.setItem("hub:editmode", next ? "1" : "0");
      } catch {
        // sin persistencia
      }
      return next;
    });
  }

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function moveSection(index: number, dir: -1 | 1) {
    const ids = groups.map((g) => g.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startAdmin(() => {
      reorderSections(ids);
    });
  }

  function moveCard(sectionId: string, cardIds: string[], index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= cardIds.length) return;
    const ids = [...cardIds];
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startAdmin(() => {
      reorderCards(sectionId, ids);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--page)] via-[var(--page)] to-[color-mix(in_srgb,var(--brand-water)_10%,var(--page))]">
      <header
        className="sticky top-0 z-20 flex h-16 items-center gap-6 px-8 transition-all duration-300 ease-out"
        style={{
          background: scrolled ? "color-mix(in srgb, var(--surface-1) 92%, transparent)" : "transparent",
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
        {isAdmin && (
          <button
            type="button"
            onClick={toggleEditMode}
            aria-pressed={editMode}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors"
            style={{
              borderColor: editMode ? "var(--brand-water)" : "var(--border)",
              background: editMode
                ? "color-mix(in srgb, var(--brand-water) 14%, transparent)"
                : "var(--surface-1)",
              color: editMode ? "var(--brand-water)" : "var(--text-secondary)",
            }}
          >
            <span
              aria-hidden
              className="grid h-4 w-7 items-center rounded-full p-0.5 transition-colors"
              style={{ background: editMode ? "var(--brand-water)" : "var(--border)" }}
            >
              <span
                className="h-3 w-3 rounded-full bg-white transition-transform"
                style={{ transform: editMode ? "translateX(12px)" : "translateX(0)" }}
              />
            </span>
            Editar
          </button>
        )}
        <AccountMenu user={member} />
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-col px-6 pb-16 pt-10 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-10">
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

          <PersonalSpace folders={folders} widgets={widgets} apps={apps} />

          <div
            className="hub-reveal flex items-center justify-between gap-4 border-b border-[var(--border)]"
            style={{ animationDelay: "90ms" }}
          >
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
            const cardIds = group.apps.map((a) => a.id);
            return (
              <section
                key={group.id}
                className="hub-reveal flex flex-col gap-4"
                style={{ animationDelay: `${120 + gi * 90}ms` }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="h-5 w-1 rounded-full" style={{ background: group.accent }} />
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{group.label}</h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${group.accent} 14%, transparent)`,
                        color: group.accent,
                      }}
                    >
                      {group.apps.length}
                    </span>
                    {canEdit && (
                      <span className="flex items-center gap-0.5">
                        <AdminBtn title="Editar sección" onClick={() => setSectionEditor(group)}>
                          ✎
                        </AdminBtn>
                        <AdminBtn title="Subir sección" disabled={gi === 0} onClick={() => moveSection(gi, -1)}>
                          ↑
                        </AdminBtn>
                        <AdminBtn
                          title="Bajar sección"
                          disabled={gi === groups.length - 1}
                          onClick={() => moveSection(gi, 1)}
                        >
                          ↓
                        </AdminBtn>
                      </span>
                    )}
                  </div>
                  {group.blurb && <p className="pl-4 text-sm text-[var(--text-muted)]">{group.blurb}</p>}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {group.apps.map((app, ci) => (
                    <div key={app.id} className="group/card relative">
                      <ToolCard app={app} revealDelay={150 + gi * 90 + ci * 55} />
                      {canEdit && (
                        <div className="absolute right-2 top-2 z-30 flex gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
                          <AdminBtn title="Mover a la izquierda" disabled={ci === 0} onClick={() => moveCard(group.id, cardIds, ci, -1)}>
                            ←
                          </AdminBtn>
                          <AdminBtn
                            title="Mover a la derecha"
                            disabled={ci === group.apps.length - 1}
                            onClick={() => moveCard(group.id, cardIds, ci, 1)}
                          >
                            →
                          </AdminBtn>
                          <AdminBtn title="Editar tarjeta" onClick={() => setCardEditor({ sectionId: group.id, card: app })}>
                            ✎
                          </AdminBtn>
                        </div>
                      )}
                    </div>
                  ))}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setCardEditor({ sectionId: group.id, card: null })}
                      className="flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[var(--border)] text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
                    >
                      <span className="text-2xl leading-none">+</span>
                      Añadir tarjeta
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          {canEdit && (
            <button
              type="button"
              onClick={() => startAdmin(async () => void (await createSection()))}
              className="hub-reveal self-start rounded-full border border-dashed border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
            >
              + Nueva sección
            </button>
          )}

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

      {cardEditor && (
        <CardEditor
          card={cardEditor.card}
          sectionId={cardEditor.sectionId}
          sections={sections}
          onClose={() => setCardEditor(null)}
        />
      )}
      {sectionEditor && <SectionEditor section={sectionEditor} onClose={() => setSectionEditor(null)} />}
    </div>
  );
}

function AdminBtn({
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
      className="grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:border-[var(--border)]"
    >
      {children}
    </button>
  );
}
