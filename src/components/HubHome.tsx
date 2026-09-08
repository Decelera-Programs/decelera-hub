"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { HubApp, Section, Subfolder } from "@/lib/apps";
import type { Folder, Widget } from "@/lib/hub";
import {
  createSection,
  createSubfolder,
  moveSubfolderToSection,
  reorderCards,
  reorderSections,
  reorderSubfolders,
} from "@/app/actions";
import { canEmbedUrl } from "@/lib/embed";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import { useHub } from "@/lib/useHub";
import { AccountMenu, type AccountUser } from "./AccountMenu";
import { CardInfoDialog } from "./CardInfoDialog";
import { EmbedArea, type EmbedTab, type EmbedTarget } from "./EmbedArea";
import { CardEditor } from "./hub-admin/CardEditor";
import { SectionEditor } from "./hub-admin/SectionEditor";
import { SubfolderEditor } from "./hub-admin/SubfolderEditor";
import { HubTree, type HubTreeHandlers, type TreeDrag, type TreeDrop } from "./HubTree";
import { SearchField } from "./HubPrimitives";
import { PersonalSpace } from "./personal/PersonalSpace";
import { WorkspaceProvider, type OpenTarget } from "./WorkspaceContext";

/** Cuántas pestañas embebidas a la vez antes de descartar la más antigua. */
const MAX_TABS = 8;

/** Pestaña inicial a partir de los parámetros de la URL (`?abre=` o `?url=&t=`). */
function tabFromUrl(sp: { get: (key: string) => string | null }, apps: HubApp[]): EmbedTab | null {
  const abre = sp.get("abre");
  if (abre) {
    const c = apps.find((a) => a.slug === abre);
    if (!c || !c.embeddable) return null;
    return {
      key: `card:${c.slug}`,
      target: {
        slug: c.slug,
        title: c.title,
        href: c.href,
        category: c.category,
        initial: c.initial,
        meta: c.meta,
      },
    };
  }
  const url = sp.get("url");
  if (url) return { key: `url:${url}`, target: { title: sp.get("t") || url, href: url } };
  return null;
}

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

  const [tabs, setTabs] = useState<EmbedTab[]>(() => {
    const t = tabFromUrl(searchParams, apps);
    return t ? [t] : [];
  });
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const t = tabFromUrl(searchParams, apps);
    return t?.key ?? null;
  });
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

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[tabs.length - 1] ?? null;
  const openSlugs = useMemo(
    () => new Set(tabs.map((t) => t.target.slug).filter((s): s is string => !!s)),
    [tabs],
  );

  // Persistencia de interruptores + restauración de pestañas (solo cliente, post-mount).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem("hub:editmode") === "1") setEditMode(true);
      if (localStorage.getItem("hub:nav") === "0") setNavOpen(false);
      const raw = localStorage.getItem("hub:tabs");
      const saved: EmbedTab[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved) && saved.length > 0) {
        setTabs((cur) => {
          const have = new Set(cur.map((t) => t.key));
          const merged = [
            ...cur,
            ...saved.filter((t) => t && typeof t.key === "string" && t.target && !have.has(t.key)),
          ];
          return merged.slice(0, MAX_TABS);
        });
        setActiveKey((cur) => cur ?? localStorage.getItem("hub:tabs:active") ?? saved[saved.length - 1]?.key ?? null);
      }
    } catch {
      // sin localStorage / JSON corrupto — se queda con lo que venga de la URL
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Guardar pestañas + sincronizar la URL con la pestaña activa.
  useEffect(() => {
    try {
      localStorage.setItem("hub:tabs", JSON.stringify(tabs));
      if (activeTab) localStorage.setItem("hub:tabs:active", activeTab.key);
      else localStorage.removeItem("hub:tabs:active");
    } catch {
      // sin persistencia
    }
    let url = "/";
    if (activeTab?.target.slug) url = `/?abre=${encodeURIComponent(activeTab.target.slug)}`;
    else if (activeTab)
      url = `/?url=${encodeURIComponent(activeTab.target.href)}&t=${encodeURIComponent(activeTab.target.title)}`;
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // navegación no disponible
    }
  }, [tabs, activeTab]);

  const persist = useCallback((key: string, on: boolean) => {
    try {
      localStorage.setItem(key, on ? "1" : "0");
    } catch {
      // sin persistencia
    }
  }, []);
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

  const setNav = useCallback(
    (on: boolean) => {
      setNavOpen(on);
      persist("hub:nav", on);
    },
    [persist],
  );

  /** Abre en una pestaña del panel si se puede embeber; si no, en pestaña nueva del navegador. */
  const openTarget = useCallback(
    (t: OpenTarget) => {
      let key: string;
      let target: EmbedTarget;
      if (t.kind === "card") {
        if (!t.card.embeddable) {
          window.open(t.card.href, "_blank", "noopener,noreferrer");
          return;
        }
        key = `card:${t.card.slug}`;
        target = {
          slug: t.card.slug,
          title: t.card.title,
          href: t.card.href,
          category: t.card.category,
          initial: t.card.initial,
          meta: t.card.meta,
        };
      } else {
        if (!canEmbedUrl(t.href)) {
          window.open(t.href, "_blank", "noopener,noreferrer");
          return;
        }
        key = `url:${t.href}`;
        target = { title: t.title, href: t.href };
      }

      setTabs((cur) => {
        if (cur.some((x) => x.key === key)) return cur;
        const next = [...cur, { key, target }];
        return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
      });
      setActiveKey(key);
      if (window.matchMedia("(max-width: 1023px)").matches) setNav(false);
    },
    [setNav],
  );

  const closeTab = useCallback(
    (key: string) => {
      const idx = tabs.findIndex((t) => t.key === key);
      if (idx < 0) return;
      const next = tabs.filter((t) => t.key !== key);
      setTabs(next);
      if (activeKey === key) {
        setActiveKey(next.length ? (next[idx] ?? next[idx - 1] ?? next[0]).key : null);
      }
    },
    [tabs, activeKey],
  );

  const workspace = useMemo(() => ({ open: openTarget }), [openTarget]);

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
  }, [persist]);

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

  /** Reubicación por arrastre en el árbol compartido. `reorderCards`/`reorderSubfolders`
   *  ya reescriben `section_id`/`subfolder_id` de cada id que reciben, así que sirven
   *  también para reparentar. */
  function onTreeDrop(drag: TreeDrag, drop: TreeDrop) {
    const cardGroup = (sectionId: string, subfolderId: string | null): string[] => {
      const sec = groups.find((g) => g.id === sectionId);
      if (!sec) return [];
      if (subfolderId)
        return sec.subfolders.find((s) => s.id === subfolderId)?.apps.map((a) => a.id) ?? [];
      return sec.apps.map((a) => a.id);
    };

    if (drag.kind === "card") {
      let sectionId: string;
      let subfolderId: string | null;
      let ids: string[];

      if (drop.on === "card") {
        sectionId = drop.card.sectionId ?? "";
        subfolderId = drop.card.subfolderId;
        ids = cardGroup(sectionId, subfolderId).filter((id) => id !== drag.id);
        const ti = ids.indexOf(drop.card.id);
        ids.splice(drop.edge === "before" ? ti : ti + 1, 0, drag.id);
      } else if (drop.on === "subfolder") {
        sectionId = drop.sub.sectionId;
        subfolderId = drop.sub.id;
        ids = [...drop.sub.apps.map((a) => a.id).filter((id) => id !== drag.id), drag.id];
      } else {
        sectionId = drop.section.id;
        subfolderId = null;
        ids = [...drop.section.apps.map((a) => a.id).filter((id) => id !== drag.id), drag.id];
      }
      if (!sectionId) return;
      startAdmin(() => reorderCards(sectionId, subfolderId, ids));
      return;
    }

    // drag.kind === "subfolder"
    const targetSectionId =
      drop.on === "section" ? drop.section.id : drop.on === "subfolder" ? drop.sub.sectionId : null;
    if (!targetSectionId) return;
    const sec = groups.find((g) => g.id === targetSectionId);
    if (!sec) return;

    const ids = sec.subfolders.map((s) => s.id).filter((id) => id !== drag.id);
    if (drop.on === "subfolder") {
      const ti = ids.indexOf(drop.sub.id);
      ids.splice(drop.mode === "before" ? ti : ti + 1, 0, drag.id);
    } else {
      ids.push(drag.id);
    }

    if (targetSectionId === drag.sectionId) {
      startAdmin(() => reorderSubfolders(targetSectionId, ids));
    } else {
      startAdmin(() => moveSubfolderToSection(drag.id, targetSectionId, ids));
    }
  }

  const handlers: HubTreeHandlers = {
    onActivate: (card) => openTarget({ kind: "card", card }),
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
    onTreeDrop,
  };

  return (
    <WorkspaceProvider value={workspace}>
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

        {activeTab && (
          <div className="ml-1 hidden min-w-0 items-center gap-1.5 text-sm text-[var(--text-muted)] md:flex">
            <span aria-hidden>/</span>
            <span className="truncate font-medium text-[var(--text-secondary)]">
              {activeTab.target.title}
            </span>
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
              activeSlug={activeTab?.target.slug}
              openSlugs={openSlugs}
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
          {tabs.length > 0 && (
            <EmbedArea
              tabs={tabs}
              activeKey={activeTab?.key ?? null}
              onSelect={setActiveKey}
              onClose={closeTab}
            />
          )}
          {/* Montado siempre (solo oculto con pestañas abiertas) para no perder el
              layout local de "Tu espacio" al abrir/cerrar una pestaña. */}
          <div className="min-h-0 flex-1 overflow-y-auto" hidden={tabs.length > 0}>
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
    </WorkspaceProvider>
  );
}
