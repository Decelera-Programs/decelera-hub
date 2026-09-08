"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { HubApp, Section, Subfolder } from "@/lib/apps";
import type { Folder, Widget } from "@/lib/hub";
import {
  createSection,
  createSubfolder,
  reorderCards,
  reorderSections,
  reorderSubfolders,
} from "@/app/actions";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import { useHub } from "@/lib/useHub";
import { AccountMenu, type AccountUser } from "./AccountMenu";
import { CardInfoDialog } from "./CardInfoDialog";
import { EmbedPane } from "./EmbedPane";
import { CardEditor } from "./hub-admin/CardEditor";
import { SectionEditor } from "./hub-admin/SectionEditor";
import { SubfolderEditor } from "./hub-admin/SubfolderEditor";
import { HubTree, type HubTreeHandlers } from "./HubTree";
import { SearchField } from "./HubPrimitives";
import { PersonalSpace } from "./personal/PersonalSpace";

const CATEGORY_TAB_LABEL: Record<string, string> = {
  Todos: "Todos",
  Dashboard: "Dashboards",
  Herramienta: "Herramientas",
  Datos: "Datos",
};

type CardEditorState = { sectionId: string; subfolderId: string | null; card: HubApp | null };

export function HubHome({
  sections,
  subfolders,
  apps,
  member,
  folders,
  widgets,
}: {
  sections: Section[];
  subfolders: Subfolder[];
  apps: HubApp[];
  member: AccountUser;
  folders: Folder[];
  widgets: Widget[];
}) {
  const searchParams = useSearchParams();
  const { query, setQuery, category, setCategory, categories, counts, groups, filtering, visibleCount, totalCount } =
    useHub(apps, sections, subfolders);
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(() => searchParams.get("abre"));
  const [navOpen, setNavOpen] = useState(true);
  const [cardEditor, setCardEditor] = useState<CardEditorState | null>(null);
  const [sectionEditor, setSectionEditor] = useState<Section | null>(null);
  const [subfolderEditor, setSubfolderEditor] = useState<Subfolder | null>(null);
  const [cardInfo, setCardInfo] = useState<HubApp | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [, startAdmin] = useTransition();
  useDragAutoScroll();

  const isAdmin = member.isAdmin;
  const canEdit = isAdmin && editMode && !filtering;

  const activeCard = activeSlug ? apps.find((a) => a.slug === activeSlug) ?? null : null;
  const embedCard = activeCard && activeCard.embeddable ? activeCard : null;

  // Persistencia de interruptores (solo cliente).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem("hub:editmode") === "1") setEditMode(true);
      if (localStorage.getItem("hub:nav") === "0") setNavOpen(false);
    } catch {
      // sin localStorage
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function persist(key: string, on: boolean) {
    try {
      localStorage.setItem(key, on ? "1" : "0");
    } catch {
      // sin persistencia
    }
  }
  function toggleEditMode() {
    setEditMode((v) => {
      persist("hub:editmode", !v);
      return !v;
    });
  }
  function toggleNav() {
    setNavOpen((v) => {
      persist("hub:nav", !v);
      return !v;
    });
  }

  function setActive(slug: string | null) {
    setActiveSlug(slug);
    const url = slug ? `/?abre=${encodeURIComponent(slug)}` : "/";
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // navegación no disponible — se queda solo en estado
    }
  }

  function setNav(on: boolean) {
    setNavOpen(on);
    persist("hub:nav", on);
  }

  /** Abre la tarjeta: en el panel si es embebible, en pestaña nueva si no. */
  function openCard(card: HubApp) {
    if (card.embeddable) {
      setActive(card.slug);
      if (window.matchMedia("(max-width: 1023px)").matches) setNav(false);
    } else {
      window.open(card.href, "_blank", "noopener,noreferrer");
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNavOpen(true);
        persist("hub:nav", true);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
  function moveSubfolder(sectionId: string, subIds: string[], index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= subIds.length) return;
    const ids = [...subIds];
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startAdmin(() => {
      reorderSubfolders(sectionId, ids);
    });
  }
  function moveCard(
    sectionId: string,
    subfolderId: string | null,
    cardIds: string[],
    index: number,
    dir: -1 | 1,
  ) {
    const j = index + dir;
    if (j < 0 || j >= cardIds.length) return;
    const ids = [...cardIds];
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startAdmin(() => {
      reorderCards(sectionId, subfolderId, ids);
    });
  }

  const handlers: HubTreeHandlers = {
    onActivate: openCard,
    onInfo: (card) => setCardInfo(card),
    onEditSection: (s) => setSectionEditor(s),
    onEditSubfolder: (sf) => setSubfolderEditor(sf),
    onEditCard: (card) =>
      setCardEditor({
        sectionId: card.sectionId ?? sections[0]?.id ?? "",
        subfolderId: card.subfolderId,
        card,
      }),
    onAddCard: (sectionId, subfolderId) => setCardEditor({ sectionId, subfolderId, card: null }),
    onAddSubfolder: (sectionId) => startAdmin(() => void createSubfolder(sectionId)),
    onMoveSection: moveSection,
    onMoveSubfolder: moveSubfolder,
    onMoveCard: moveCard,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--page)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-3 sm:px-4">
        <button
          type="button"
          onClick={toggleNav}
          aria-label={navOpen ? "Ocultar navegación" : "Mostrar navegación"}
          aria-pressed={navOpen}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6" />
          <div className="hidden items-baseline gap-1.5 sm:flex">
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Hub</span>
          </div>
        </div>

        {activeCard && (
          <div className="ml-1 hidden min-w-0 items-center gap-1.5 text-sm text-[var(--text-muted)] md:flex">
            <span aria-hidden>/</span>
            <span className="truncate font-medium text-[var(--text-secondary)]">{activeCard.title}</span>
          </div>
        )}

        <div className="flex-1" />

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
            <span className="hidden sm:inline">Editar</span>
          </button>
        )}
        <AccountMenu user={member} />
      </header>

      <div className="relative flex min-h-0 flex-1">
        {navOpen && (
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={toggleNav}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          />
        )}

        <aside
          className={`z-40 flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface-1)] transition-all duration-200 ease-out max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-2xl ${
            navOpen
              ? "translate-x-0 lg:ml-0"
              : "max-lg:-translate-x-full lg:ml-[-300px]"
          }`}
        >
          <div className="flex flex-col gap-2 border-b border-[var(--border)] p-3">
            <SearchField
              value={query}
              onChange={setQuery}
              shortcut
              placeholder="Buscar…"
              className="h-9 w-full"
              inputRef={searchRef}
            />
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {categories.map((c) => {
                const on = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
                    style={{
                      background: on ? "color-mix(in srgb, var(--brand-water) 16%, transparent)" : "transparent",
                      color: on ? "var(--brand-sea)" : "var(--text-muted)",
                    }}
                  >
                    {CATEGORY_TAB_LABEL[c] ?? c}
                    <span className="ml-1 font-medium text-[var(--text-muted)]">{counts[c] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto p-2">
            <HubTree
              groups={groups}
              canEdit={canEdit}
              filtering={filtering}
              handlers={handlers}
              activeSlug={activeSlug ?? undefined}
            />

            {canEdit && (
              <button
                type="button"
                onClick={() => startAdmin(async () => void (await createSection()))}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
              >
                <span className="text-sm leading-none">+</span> Nueva sección
              </button>
            )}

            {groups.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-[var(--text-muted)]">
                Sin resultados{query.trim() ? ` para “${query}”` : " en esta categoría"}.
              </p>
            )}
            {filtering && groups.length > 0 && (
              <p className="px-2 pt-2 text-[11px] text-[var(--text-muted)]">
                {visibleCount} de {totalCount} módulos.
              </p>
            )}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {embedCard ? (
            <EmbedPane key={embedCard.id} card={embedCard} onClose={() => setActive(null)} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-6 py-10 lg:px-10">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-sea)]">
                    Espacio de trabajo
                  </span>
                  <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                    Herramientas del equipo
                  </h1>
                  <p className="max-w-lg text-[15px] text-[var(--text-secondary)]">
                    Abre cualquier módulo desde el árbol de la izquierda. {totalCount} módulo
                    {totalCount === 1 ? "" : "s"}, organizados por área.
                  </p>
                </div>

                <PersonalSpace folders={folders} widgets={widgets} apps={apps} />
              </div>
            </div>
          )}
        </main>
      </div>

      {cardEditor && (
        <CardEditor
          card={cardEditor.card}
          sectionId={cardEditor.sectionId}
          subfolderId={cardEditor.subfolderId}
          sections={sections}
          subfolders={subfolders}
          onClose={() => setCardEditor(null)}
        />
      )}
      {sectionEditor && <SectionEditor section={sectionEditor} onClose={() => setSectionEditor(null)} />}
      {subfolderEditor && (
        <SubfolderEditor subfolder={subfolderEditor} onClose={() => setSubfolderEditor(null)} />
      )}
      {cardInfo && <CardInfoDialog card={cardInfo} onClose={() => setCardInfo(null)} />}
    </div>
  );
}
