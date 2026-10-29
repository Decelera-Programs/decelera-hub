"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CATEGORY_TINT, type HubApp, type Section } from "@/lib/apps";
import type { CategoryFilter, TreeSection, TreeSubfolder } from "@/lib/useHub";
import { IconTile, SearchField, StatusPill } from "./HubPrimitives";

export type DriveHandlers = {
  onOpen: (card: HubApp) => void;
  onInfo: (card: HubApp) => void;
  onEditSection: (s: Section) => void;
  onEditSubfolder: (sf: TreeSubfolder) => void;
  onEditCard: (card: HubApp) => void;
  onAddSection: () => void;
  onAddSubfolder: (sectionId: string) => void;
  onAddCard: (sectionId: string, subfolderId: string | null) => void;
  onMoveSection: (index: number, dir: -1 | 1) => void;
  onMoveSubfolder: (sectionId: string, subIds: string[], index: number, dir: -1 | 1) => void;
  onMoveCard: (
    sectionId: string,
    subfolderId: string | null,
    cardIds: string[],
    index: number,
    dir: -1 | 1,
  ) => void;
};

type Path = { sectionId: string | null; subfolderId: string | null };
type ViewMode = "grid" | "list";

const CATEGORY_LABEL: Record<string, string> = {
  Todos: "Todos",
  Dashboard: "Dashboards",
  Herramienta: "Herramientas",
  Datos: "Datos",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function DriveView({
  groups,
  query,
  setQuery,
  category,
  setCategory,
  categories,
  counts,
  filtering,
  totalCount,
  canEdit,
  openSlugs,
  recents,
  handlers,
  searchRef,
}: {
  groups: TreeSection[];
  query: string;
  setQuery: (q: string) => void;
  category: CategoryFilter;
  setCategory: (c: CategoryFilter) => void;
  categories: CategoryFilter[];
  counts: Record<string, number>;
  filtering: boolean;
  totalCount: number;
  canEdit: boolean;
  openSlugs: Set<string>;
  recents: HubApp[];
  handlers: DriveHandlers;
  searchRef: React.Ref<HTMLInputElement>;
}) {
  const [path, setPath] = useState<Path>({ sectionId: null, subfolderId: null });
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem("hub:view") === "list") setView("list");
    } catch {
      // sin persistencia
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function changeView(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem("hub:view", v);
    } catch {
      // sin persistencia
    }
  }

  // Si la carpeta actual desaparece (borrada o filtrada) volvemos al nivel que sigue existiendo.
  const section = groups.find((g) => g.id === path.sectionId) ?? null;
  const subfolder = section?.subfolders.find((s) => s.id === path.subfolderId) ?? null;
  const here: Path = {
    sectionId: section?.id ?? null,
    subfolderId: subfolder?.id ?? null,
  };

  const flat = useMemo(() => {
    const out: { app: HubApp; where: string }[] = [];
    for (const g of groups) {
      for (const a of g.apps) out.push({ app: a, where: g.label });
      for (const sf of g.subfolders)
        for (const a of sf.apps) out.push({ app: a, where: `${g.label} › ${sf.label}` });
    }
    return out;
  }, [groups]);

  const atRoot = !here.sectionId;
  const showResults = filtering;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-6 py-8 lg:px-10">
      {atRoot && !showResults ? (
        <Hero
          totalCount={totalCount}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Breadcrumb
            path={showResults ? null : here}
            section={section}
            subfolder={subfolder}
            onGo={setPath}
            results={showResults}
          />
          <div className="flex-1" />
          <SearchField
            value={query}
            onChange={setQuery}
            shortcut
            placeholder="Buscar…"
            className="h-10 w-full max-w-xs"
            inputRef={searchRef}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => {
          const on = c === category;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors"
              style={{
                borderColor: on ? "color-mix(in srgb, var(--brand-water) 55%, transparent)" : "var(--border)",
                background: on ? "color-mix(in srgb, var(--brand-water) 15%, transparent)" : "var(--surface-1)",
                color: on ? "var(--brand-sea)" : "var(--text-secondary)",
              }}
            >
              {CATEGORY_LABEL[c] ?? c}
              <span className="ml-1.5 font-medium text-[var(--text-muted)]">{counts[c] ?? 0}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <ViewToggle view={view} onChange={changeView} />
      </div>

      {showResults ? (
        <Block title={plural(flat.length, "resultado", "resultados")}>
          {flat.length === 0 ? (
            <Empty>Sin resultados{query.trim() ? ` para “${query}”` : " en esta categoría"}.</Empty>
          ) : (
            <Files
              view={view}
              items={flat.map((f) => f.app)}
              wheres={flat.map((f) => f.where)}
              openSlugs={openSlugs}
              canEdit={false}
              handlers={handlers}
              reorder={null}
            />
          )}
        </Block>
      ) : (
        <>
          {atRoot && recents.length > 0 && (
            <Block title="Recientes">
              <Files
                view="grid"
                items={recents}
                wheres={recents.map(() => "")}
                openSlugs={openSlugs}
                canEdit={false}
                handlers={handlers}
                reorder={null}
                compact
              />
            </Block>
          )}

          {atRoot ? (
            <Block title="Carpetas">
              <FolderGrid>
                {groups.map((g, i) => (
                  <FolderTile
                    key={g.id}
                    label={g.label}
                    hint={g.blurb || plural(g.count, "elemento", "elementos")}
                    count={g.count}
                    accent={g.accent}
                    canEdit={canEdit}
                    onOpen={() => setPath({ sectionId: g.id, subfolderId: null })}
                    onEdit={() => handlers.onEditSection(g)}
                    onMove={(dir) => handlers.onMoveSection(i, dir)}
                    first={i === 0}
                    last={i === groups.length - 1}
                  />
                ))}
                {canEdit && <AddTile label="Nueva carpeta" onClick={handlers.onAddSection} />}
              </FolderGrid>
              {groups.length === 0 && <Empty>Todavía no hay carpetas.</Empty>}
            </Block>
          ) : (
            section && (
              <Level
                section={section}
                subfolder={subfolder}
                view={view}
                canEdit={canEdit}
                openSlugs={openSlugs}
                handlers={handlers}
                onGo={setPath}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------ Nivel de carpeta ------------------------------ */

function Level({
  section,
  subfolder,
  view,
  canEdit,
  openSlugs,
  handlers,
  onGo,
}: {
  section: TreeSection;
  subfolder: TreeSubfolder | null;
  view: ViewMode;
  canEdit: boolean;
  openSlugs: Set<string>;
  handlers: DriveHandlers;
  onGo: (p: Path) => void;
}) {
  const apps = subfolder ? subfolder.apps : section.apps;
  const subIds = section.subfolders.map((s) => s.id);

  return (
    <>
      {!subfolder && (section.subfolders.length > 0 || canEdit) && (
        <Block title="Carpetas">
          <FolderGrid>
            {section.subfolders.map((sf, i) => (
              <FolderTile
                key={sf.id}
                label={sf.label}
                hint={plural(sf.apps.length, "elemento", "elementos")}
                count={sf.apps.length}
                accent={section.accent}
                canEdit={canEdit}
                onOpen={() => onGo({ sectionId: section.id, subfolderId: sf.id })}
                onEdit={() => handlers.onEditSubfolder(sf)}
                onMove={(dir) => handlers.onMoveSubfolder(section.id, subIds, i, dir)}
                first={i === 0}
                last={i === section.subfolders.length - 1}
              />
            ))}
            {canEdit && (
              <AddTile label="Nueva subcarpeta" onClick={() => handlers.onAddSubfolder(section.id)} />
            )}
          </FolderGrid>
        </Block>
      )}

      <Block title={subfolder || section.subfolders.length > 0 ? "Archivos" : undefined}>
        {apps.length === 0 && !canEdit ? (
          <Empty>Esta carpeta está vacía.</Empty>
        ) : (
          <Files
            view={view}
            items={apps}
            wheres={apps.map(() => "")}
            openSlugs={openSlugs}
            canEdit={canEdit}
            handlers={handlers}
            reorder={{ sectionId: section.id, subfolderId: subfolder?.id ?? null }}
            onAdd={() => handlers.onAddCard(section.id, subfolder?.id ?? null)}
          />
        )}
      </Block>
    </>
  );
}

/* ---------------------------------- Piezas ---------------------------------- */

function Hero({
  totalCount,
  query,
  setQuery,
  searchRef,
}: {
  totalCount: number;
  query: string;
  setQuery: (q: string) => void;
  searchRef: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="aurora hub-reveal rounded-[28px] px-7 py-10 sm:px-10 sm:py-12">
      <span aria-hidden className="aurora-sun" />
      <span aria-hidden className="dot-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="flex max-w-2xl flex-col gap-4">
        <span className="glass-dark inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-sky)]">
          <span aria-hidden className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--brand-water)]" />
          Espacio de trabajo
        </span>
        <h1 className="text-4xl leading-[1.1] tracking-tight sm:text-6xl" style={{ fontWeight: 200 }}>
          Decelera <span className="text-gradient">Brain</span>
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-[var(--brand-cloud)]">
          {totalCount} módulo{totalCount === 1 ? "" : "s"}, organizados por área. Busca o entra en una carpeta.
        </p>
        <SearchField
          value={query}
          onChange={setQuery}
          shortcut
          placeholder="Buscar dashboards, herramientas, datos…"
          className="glass-dark mt-2 h-12 w-full max-w-xl !border-[rgba(242,248,250,0.18)] !bg-[rgba(242,248,250,0.1)] text-[var(--brand-sky)]"
          inputRef={searchRef}
        />
      </div>
    </div>
  );
}

function Breadcrumb({
  path,
  section,
  subfolder,
  onGo,
  results,
}: {
  path: Path | null;
  section: TreeSection | null;
  subfolder: TreeSubfolder | null;
  onGo: (p: Path) => void;
  results: boolean;
}) {
  const crumb = "rounded-lg px-2 py-1 transition-colors hover:bg-[var(--row-hover)]";
  return (
    <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-lg">
      <button type="button" className={`${crumb} text-[var(--text-secondary)]`} onClick={() => onGo({ sectionId: null, subfolderId: null })}>
        Inicio
      </button>
      {results && <Sep current>Resultados</Sep>}
      {!results && path && section && (
        <>
          <Sep>
            <button
              type="button"
              className={`${crumb} ${subfolder ? "text-[var(--text-secondary)]" : "font-semibold text-[var(--text-primary)]"}`}
              onClick={() => onGo({ sectionId: section.id, subfolderId: null })}
            >
              {section.label}
            </button>
          </Sep>
          {subfolder && (
            <Sep>
              <span className="px-2 py-1 font-semibold text-[var(--text-primary)]">{subfolder.label}</span>
            </Sep>
          )}
        </>
      )}
    </nav>
  );
}

function Sep({ children, current }: { children: ReactNode; current?: boolean }) {
  return (
    <>
      <span aria-hidden className="text-[var(--text-muted)]">
        ›
      </span>
      {current ? <span className="px-2 py-1 font-semibold text-[var(--text-primary)]">{children}</span> : children}
    </>
  );
}

function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]" style={{ fontFamily: "var(--font-sans), system-ui" }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">
      {children}
    </div>
  );
}

function FolderGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function FolderTile({
  label,
  hint,
  count,
  accent,
  canEdit,
  onOpen,
  onEdit,
  onMove,
  first,
  last,
}: {
  label: string;
  hint: string;
  count: number;
  accent: string;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  return (
    <div className="hub-reveal spotlight card group relative flex items-center gap-3.5 px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir carpeta ${label}`}
        className="absolute inset-0 z-10 rounded-[20px]"
      />
      <span
        className="relative z-0 grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
      >
        <FolderGlyph />
      </span>
      <span className="relative z-0 flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="truncate text-xs text-[var(--text-muted)]">{hint}</span>
      </span>
      <span
        className="relative z-0 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
      >
        {count}
      </span>
      {canEdit && <EditBar onEdit={onEdit} onMove={onMove} first={first} last={last} />}
    </div>
  );
}

function AddTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] items-center justify-center gap-2 rounded-[20px] border border-dashed border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
    >
      <span className="text-lg leading-none">+</span> {label}
    </button>
  );
}

function EditBar({
  onEdit,
  onMove,
  first,
  last,
}: {
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  const btn =
    "grid h-6 w-6 place-items-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)] disabled:opacity-30";
  return (
    <span className="glass absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-lg border border-[var(--border)] p-0.5">
      <button type="button" className={btn} disabled={first} onClick={() => onMove(-1)} aria-label="Mover antes">
        ‹
      </button>
      <button type="button" className={btn} disabled={last} onClick={() => onMove(1)} aria-label="Mover después">
        ›
      </button>
      <button type="button" className={btn} onClick={onEdit} aria-label="Editar">
        ✎
      </button>
    </span>
  );
}

function Files({
  view,
  items,
  wheres,
  openSlugs,
  canEdit,
  handlers,
  reorder,
  onAdd,
  compact = false,
}: {
  view: ViewMode;
  items: HubApp[];
  wheres: string[];
  openSlugs: Set<string>;
  canEdit: boolean;
  handlers: DriveHandlers;
  reorder: { sectionId: string; subfolderId: string | null } | null;
  onAdd?: () => void;
  compact?: boolean;
}) {
  const ids = items.map((a) => a.id);
  const edit = (a: HubApp, i: number) =>
    canEdit && reorder ? (
      <EditBar
        onEdit={() => handlers.onEditCard(a)}
        onMove={(dir) => handlers.onMoveCard(reorder.sectionId, reorder.subfolderId, ids, i, dir)}
        first={i === 0}
        last={i === items.length - 1}
      />
    ) : null;

  if (view === "list" && !compact) {
    return (
      <div className="card overflow-hidden">
        {items.map((a, i) => (
          <FileRow
            key={a.id}
            app={a}
            where={wheres[i]}
            open={!!a.slug && openSlugs.has(a.slug)}
            onOpen={() => handlers.onOpen(a)}
            onInfo={() => handlers.onInfo(a)}
            editBar={edit(a, i)}
          />
        ))}
        {canEdit && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)]"
          >
            <span className="text-lg leading-none">+</span> Nueva tarjeta
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${compact ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4"}`}
    >
      {items.map((a, i) => (
        <FileTile
          key={a.id}
          app={a}
          where={wheres[i]}
          open={!!a.slug && openSlugs.has(a.slug)}
          delay={Math.min(i, 12) * 35}
          onOpen={() => handlers.onOpen(a)}
          onInfo={() => handlers.onInfo(a)}
          editBar={edit(a, i)}
        />
      ))}
      {canEdit && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[176px] flex-col items-center justify-center gap-1 rounded-[20px] border border-dashed border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
        >
          <span className="text-2xl leading-none">+</span> Nueva tarjeta
        </button>
      )}
    </div>
  );
}

function FileTile({
  app,
  where,
  open,
  delay,
  onOpen,
  onInfo,
  editBar,
}: {
  app: HubApp;
  where: string;
  open: boolean;
  delay: number;
  onOpen: () => void;
  onInfo: () => void;
  editBar: ReactNode;
}) {
  const tint = CATEGORY_TINT[app.category];
  return (
    <div
      className="hub-card hub-reveal spotlight card group relative flex flex-col overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button type="button" onClick={onOpen} aria-label={`Abrir ${app.title}`} className="absolute inset-0 z-10 rounded-[20px]" />
      <div
        className="relative z-0 grid h-[104px] place-items-center"
        style={{
          background: `radial-gradient(90% 120% at 50% 0%, ${tint.bg}, transparent 75%), color-mix(in srgb, var(--surface-1) 60%, transparent)`,
        }}
      >
        <span className="hub-icon">
          <IconTile category={app.category} initial={app.initial} size={52} />
        </span>
        <span className="absolute right-2.5 top-2.5">
          <StatusPill status={app.status} />
        </span>
        {open && (
          <span
            title="Abierto en una pestaña"
            className="pulse-dot absolute left-3 top-3 h-2 w-2 rounded-full"
            style={{ background: "var(--brand-water)" }}
          />
        )}
      </div>
      <div className="relative z-0 flex flex-1 flex-col gap-1 border-t border-[var(--border)] px-4 py-3">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {where || app.meta || app.category}
        </p>
        <h3 className="truncate text-[15px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sans), system-ui" }}>
          {app.title}
          {app.restricted && <span title="Acceso restringido"> 🔒</span>}
        </h3>
        {app.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{app.description}</p>
        )}
      </div>
      {editBar ?? (
        <button
          type="button"
          onClick={onInfo}
          aria-label={`Información de ${app.title}`}
          className="glass absolute left-2.5 top-[68px] z-20 grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] text-xs text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
        >
          i
        </button>
      )}
    </div>
  );
}

function FileRow({
  app,
  where,
  open,
  onOpen,
  onInfo,
  editBar,
}: {
  app: HubApp;
  where: string;
  open: boolean;
  onOpen: () => void;
  onInfo: () => void;
  editBar: ReactNode;
}) {
  return (
    <div className="group relative flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--row-hover)]">
      <button type="button" onClick={onOpen} aria-label={`Abrir ${app.title}`} className="absolute inset-0 z-10" />
      <IconTile category={app.category} initial={app.initial} size={30} />
      <span className="relative z-0 flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {app.title}
          {app.restricted && <span title="Acceso restringido"> 🔒</span>}
        </span>
        <span className="truncate text-xs text-[var(--text-muted)]">{where || app.meta || app.description}</span>
      </span>
      {open && <span className="pulse-dot relative z-0 h-2 w-2 rounded-full" style={{ background: "var(--brand-water)" }} />}
      <span className="relative z-0 hidden text-xs text-[var(--text-muted)] sm:block">{app.category}</span>
      <span className="relative z-0">
        <StatusPill status={app.status} />
      </span>
      {editBar ?? (
        <button
          type="button"
          onClick={onInfo}
          aria-label={`Información de ${app.title}`}
          className="relative z-20 grid h-6 w-6 place-items-center rounded-md text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
        >
          i
        </button>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const base = "grid h-8 w-9 place-items-center transition-colors";
  const on = "bg-[color-mix(in_srgb,var(--brand-water)_16%,transparent)] text-[var(--brand-sea)]";
  const off = "text-[var(--text-muted)] hover:text-[var(--text-primary)]";
  return (
    <div className="flex overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-1)]" role="group" aria-label="Vista">
      <button type="button" className={`${base} ${view === "grid" ? on : off}`} onClick={() => onChange("grid")} aria-label="Cuadrícula" aria-pressed={view === "grid"}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="2" y="2" width="5" height="5" rx="1.2" />
          <rect x="9" y="2" width="5" height="5" rx="1.2" />
          <rect x="2" y="9" width="5" height="5" rx="1.2" />
          <rect x="9" y="9" width="5" height="5" rx="1.2" />
        </svg>
      </button>
      <button type="button" className={`${base} ${view === "list" ? on : off}`} onClick={() => onChange("list")} aria-label="Lista" aria-pressed={view === "list"}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
        </svg>
      </button>
    </div>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.5.7L12 7h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" opacity=".9" />
    </svg>
  );
}
