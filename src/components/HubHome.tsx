"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { HubApp, Section, Subfolder } from "@/lib/apps";
import {
  createSection,
  createSubfolder,
  reorderCards,
  reorderSections,
  reorderSubfolders,
} from "@/app/actions";
import { canEmbedUrl } from "@/lib/embed";
import { useHub } from "@/lib/useHub";
import { AccountMenu, type AccountUser } from "./AccountMenu";
import { CardInfoDialog } from "./CardInfoDialog";
import { DriveView, type DriveHandlers } from "./DriveView";
import { EmbedArea, type EmbedTab, type EmbedTarget } from "./EmbedArea";
import { CardEditor } from "./hub-admin/CardEditor";
import { SectionEditor } from "./hub-admin/SectionEditor";
import { SubfolderEditor } from "./hub-admin/SubfolderEditor";
import { PageSwitcher } from "./PageSwitcher";
import { WorkspaceProvider, type OpenTarget } from "./WorkspaceContext";

/** Cuántas pestañas embebidas a la vez antes de descartar la más antigua. */
const MAX_TABS = 8;
/** Cuántos módulos recientes se recuerdan. */
const MAX_RECENTS = 4;

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

type CardEditorState = { sectionId: string; subfolderId: string | null; card: HubApp | null };

export function HubHome({
  sections,
  subfolders,
  apps,
  member,
}: {
  sections: Section[];
  subfolders: Subfolder[];
  apps: HubApp[];
  member: AccountUser;
}) {
  const searchParams = useSearchParams();
  const { query, setQuery, category, setCategory, categories, counts, groups, filtering, totalCount } = useHub(
    apps,
    sections,
    subfolders,
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const [tabs, setTabs] = useState<EmbedTab[]>(() => {
    const t = tabFromUrl(searchParams, apps);
    return t ? [t] : [];
  });
  // null = pestaña "Inicio" (la vista de carpetas).
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const t = tabFromUrl(searchParams, apps);
    return t?.key ?? null;
  });
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [cardEditor, setCardEditor] = useState<CardEditorState | null>(null);
  const [sectionEditor, setSectionEditor] = useState<Section | null>(null);
  const [subfolderEditor, setSubfolderEditor] = useState<Subfolder | null>(null);
  const [cardInfo, setCardInfo] = useState<HubApp | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [, startAdmin] = useTransition();

  const isAdmin = member.isAdmin;
  const canEdit = isAdmin && editMode && !filtering;

  const activeTab = tabs.find((t) => t.key === activeKey) ?? null;
  const openSlugs = useMemo(
    () => new Set(tabs.map((t) => t.target.slug).filter((s): s is string => !!s)),
    [tabs],
  );
  const recents = useMemo(
    () =>
      recentSlugs
        .map((s) => apps.find((a) => a.slug === s))
        .filter((a): a is HubApp => !!a)
        .slice(0, MAX_RECENTS),
    [recentSlugs, apps],
  );

  // Persistencia de interruptores + restauración de pestañas (solo cliente, post-mount).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem("hub:editmode") === "1") setEditMode(true);
      const rec = JSON.parse(localStorage.getItem("hub:recent") ?? "[]");
      if (Array.isArray(rec)) setRecentSlugs(rec.filter((s): s is string => typeof s === "string"));
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
        setActiveKey((cur) => cur ?? localStorage.getItem("hub:tabs:active") ?? null);
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

  function toggleEditMode() {
    setEditMode((v) => {
      try {
        localStorage.setItem("hub:editmode", !v ? "1" : "0");
      } catch {
        // sin persistencia
      }
      return !v;
    });
  }

  const rememberRecent = useCallback((slug: string) => {
    setRecentSlugs((cur) => {
      const next = [slug, ...cur.filter((s) => s !== slug)].slice(0, 12);
      try {
        localStorage.setItem("hub:recent", JSON.stringify(next));
      } catch {
        // sin persistencia
      }
      return next;
    });
  }, []);

  /** Abre en una pestaña del panel si se puede embeber; si no, en pestaña nueva del navegador. */
  const openTarget = useCallback(
    (t: OpenTarget) => {
      let key: string;
      let target: EmbedTarget;
      if (t.kind === "card") {
        rememberRecent(t.card.slug);
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
    },
    [rememberRecent],
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

  // Ctrl/Cmd+K: vuelve a Inicio y enfoca el buscador.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveKey(null);
        setTimeout(() => searchRef.current?.focus(), 0);
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

  const handlers: DriveHandlers = {
    onOpen: (card) => openTarget({ kind: "card", card }),
    onInfo: (card) => setCardInfo(card),
    onEditSection: (s) => setSectionEditor(s),
    onEditSubfolder: (sf) => setSubfolderEditor(sf),
    onEditCard: (card) =>
      setCardEditor({
        sectionId: card.sectionId ?? sections[0]?.id ?? "",
        subfolderId: card.subfolderId,
        card,
      }),
    onAddSection: () => startAdmin(async () => void (await createSection())),
    onAddCard: (sectionId, subfolderId) => setCardEditor({ sectionId, subfolderId, card: null }),
    onAddSubfolder: (sectionId) => startAdmin(() => void createSubfolder(sectionId)),
    onMoveSection: moveSection,
    onMoveSubfolder: moveSubfolder,
    onMoveCard: moveCard,
  };

  const homeActive = activeTab === null;

  return (
    <WorkspaceProvider value={workspace}>
      <div className="ambient flex h-screen flex-col overflow-hidden bg-[var(--page)]">
        <header className="glass hub-header relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setActiveKey(null)}
            aria-label="Ir a Inicio"
            className="flex items-center gap-2 rounded-lg"
          >
            <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6" />
            <div className="hidden items-baseline gap-1.5 lg:flex">
              <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
              <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Brain</span>
            </div>
          </button>

          {/* En móvil, sin sitio para centrarla: va en línea tras el logo. */}
          <div className="sm:hidden">
            <PageSwitcher />
          </div>

          {/* Navegación de páginas centrada en la cabecera. */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
            <div className="pointer-events-auto">
              <PageSwitcher />
            </div>
          </div>

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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {tabs.length > 0 && (
            <EmbedArea
              tabs={tabs}
              activeKey={activeTab?.key ?? null}
              homeActive={homeActive}
              onHome={() => setActiveKey(null)}
              onSelect={setActiveKey}
              onClose={closeTab}
            />
          )}
          {/* Montado siempre (solo oculto con una pestaña abierta) para conservar la
              carpeta en la que estabas al volver a Inicio. */}
          <div className="min-h-0 flex-1 overflow-y-auto" hidden={!homeActive}>
            <DriveView
              groups={groups}
              query={query}
              setQuery={setQuery}
              category={category}
              setCategory={setCategory}
              categories={categories}
              counts={counts}
              filtering={filtering}
              totalCount={totalCount}
              canEdit={canEdit}
              openSlugs={openSlugs}
              recents={recents}
              handlers={handlers}
              searchRef={searchRef}
            />
          </div>
        </main>

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
