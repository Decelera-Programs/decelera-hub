"use client";

import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { STATUS_LABEL, type AppStatus, type HubApp } from "@/lib/apps";
import type { TreeSection, TreeSubfolder } from "@/lib/useHub";
import { AdminBtn } from "./hub-admin/editorUi";
import { IconTile } from "./HubPrimitives";

/** Qué se está arrastrando dentro del árbol (solo en modo Editar). */
export type TreeDrag =
  | { kind: "card"; id: string; sectionId: string; subfolderId: string | null }
  | { kind: "subfolder"; id: string; sectionId: string };

/** Dónde se suelta. */
export type TreeDrop =
  | { on: "card"; card: HubApp; edge: "before" | "after" }
  | { on: "subfolder"; sub: TreeSubfolder; mode: "into" | "before" | "after" }
  | { on: "section"; section: TreeSection };

export type HubTreeHandlers = {
  /** Abrir la tarjeta: en el panel si es embebible, en pestaña nueva si no. */
  onActivate: (card: HubApp) => void;
  onInfo: (card: HubApp) => void;
  onEditSection: (section: TreeSection) => void;
  onEditSubfolder: (sub: TreeSubfolder) => void;
  onEditCard: (card: HubApp) => void;
  onAddCard: (sectionId: string, subfolderId: string | null) => void;
  onAddSubfolder: (sectionId: string) => void;
  onMoveSection: (index: number, dir: -1 | 1) => void;
  onMoveSubfolder: (sectionId: string, ids: string[], index: number, dir: -1 | 1) => void;
  onMoveCard: (
    sectionId: string,
    subfolderId: string | null,
    ids: string[],
    index: number,
    dir: -1 | 1,
  ) => void;
  /** Reubicación por arrastre dentro del árbol compartido. */
  onTreeDrop: (drag: TreeDrag, drop: TreeDrop) => void;
};

type Ctx = {
  canEdit: boolean;
  filtering: boolean;
  handlers: HubTreeHandlers;
  activeSlug?: string;
  openSlugs?: Set<string>;
};

/**
 * Payload del arrastre en curso. Módulo-global a propósito: `dataTransfer` no se
 * puede leer en `dragover`, es estado efímero que nunca debe provocar render, y el
 * árbol es único en la app.
 */
let currentDrag: TreeDrag | null = null;

/** Fantasma de arrastre limpio (el snapshot nativo incluye hijos absolutos y sale raro). */
function setDragGhost(e: ReactDragEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const ghost = el.cloneNode(true) as HTMLElement;
  ghost.style.cssText +=
    `;position:fixed;top:0;left:-9999px;width:${Math.round(rect.width)}px;margin:0;` +
    "background:var(--surface-1);border:1px solid var(--border);border-radius:8px;" +
    "box-shadow:0 14px 34px -10px rgba(20,25,40,.4);opacity:1;pointer-events:none";
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 14, rect.height / 2);
  requestAnimationFrame(() => ghost.remove());
}

/** Estilo del resaltado según dónde caería el drop. */
function hintStyle(hint: "into" | "before" | "after" | null): CSSProperties | undefined {
  if (hint === "into")
    return {
      outline: "2px solid var(--brand-water)",
      outlineOffset: "-2px",
      background: "color-mix(in srgb, var(--brand-water) 8%, transparent)",
    };
  if (hint === "before") return { boxShadow: "inset 0 2px 0 0 var(--brand-water)" };
  if (hint === "after") return { boxShadow: "inset 0 -2px 0 0 var(--brand-water)" };
  return undefined;
}

/**
 * Árbol de navegación del hub (nav lateral del workspace): sección → subcarpeta →
 * tarjeta, con conectores redondeados estilo diagrama de README y colapso recordado
 * por nodo. Al activar una hoja se abre en el panel (o en pestaña nueva si no se
 * puede embeber).
 */
export function HubTree({
  groups,
  canEdit,
  filtering,
  handlers,
  activeSlug,
  openSlugs,
}: {
  groups: TreeSection[];
  canEdit: boolean;
  filtering: boolean;
  handlers: HubTreeHandlers;
  activeSlug?: string;
  openSlugs?: Set<string>;
}) {
  const ctx: Ctx = { canEdit, filtering, handlers, activeSlug, openSlugs };
  return (
    <div className="flex flex-col gap-1">
      {groups.map((section, i) => (
        <SectionNode key={section.id} section={section} index={i} total={groups.length} ctx={ctx} />
      ))}
    </div>
  );
}

// --- Nodos ---------------------------------------------------------------------

function SectionNode({
  section,
  index,
  total,
  ctx,
}: {
  section: TreeSection;
  index: number;
  total: number;
  ctx: Ctx;
}) {
  const { canEdit, filtering, handlers } = ctx;
  const [open, toggle] = useCollapse(`sec:${section.id}`, true);
  const [hint, setHint] = useState<"into" | null>(null);
  const isOpen = filtering || open;
  const accent = section.accent;

  // Drop en la cabecera de la sección: mete la tarjeta al nivel de la sección, o
  // mueve una subcarpeta a esta sección.
  function canDrop() {
    const d = currentDrag;
    if (!canEdit || !d) return false;
    if (d.kind === "card") return true;
    if (d.kind === "subfolder") return d.sectionId !== section.id;
    return false;
  }
  function onDragOver(e: ReactDragEvent) {
    if (!canDrop()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hint !== "into") setHint("into");
  }
  function onDrop(e: ReactDragEvent) {
    const d = currentDrag;
    setHint(null);
    if (!canDrop() || !d) return;
    e.preventDefault();
    e.stopPropagation();
    handlers.onTreeDrop(d, { on: "section", section });
  }

  const subIds = section.subfolders.map((s) => s.id);
  const directIds = section.apps.map((a) => a.id);

  const nodes: ReactNode[] = [
    ...section.subfolders.map((sf, i) => (
      <SubfolderNode
        key={`sf-${sf.id}`}
        sub={sf}
        section={section}
        subIndex={i}
        subIds={subIds}
        ctx={ctx}
      />
    )),
    ...section.apps.map((card, i) => (
      <LeafRow
        key={`c-${card.id}`}
        card={card}
        index={i}
        count={directIds.length}
        ctx={ctx}
        onMove={(dir) => handlers.onMoveCard(section.id, null, directIds, i, dir)}
      />
    )),
  ];

  if (canEdit && !filtering) {
    nodes.push(
      <AddRow key="add-sf" label="subcarpeta" onClick={() => handlers.onAddSubfolder(section.id)} />,
      <AddRow key="add-card" label="tarjeta" onClick={() => handlers.onAddCard(section.id, null)} />,
    );
  }

  return (
    <div className="select-none">
      <div
        className="group relative flex items-center gap-1 rounded-lg"
        style={hintStyle(hint)}
        onDragOver={onDragOver}
        onDragLeave={() => setHint(null)}
        onDrop={onDrop}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--row-hover)]"
        >
          <Chevron open={isOpen} />
          <FolderIcon color={accent} />
          <span className="truncate text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">
            {section.label}
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              color: accent,
            }}
          >
            {section.count}
          </span>
        </button>

        {canEdit && (
          <span className="relative z-10 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <AdminBtn title="Editar sección" onClick={() => handlers.onEditSection(section)}>
              ✎
            </AdminBtn>
            <AdminBtn
              title="Subir sección"
              disabled={index === 0}
              onClick={() => handlers.onMoveSection(index, -1)}
            >
              ↑
            </AdminBtn>
            <AdminBtn
              title="Bajar sección"
              disabled={index === total - 1}
              onClick={() => handlers.onMoveSection(index, 1)}
            >
              ↓
            </AdminBtn>
          </span>
        )}
      </div>

      {isOpen && (
        <div className="tree-expand pl-3">
          {nodes.length > 0 ? (
            <TreeList items={nodes} />
          ) : (
            <p className="py-1 pl-2 text-xs text-[var(--text-muted)]">Vacío.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SubfolderNode({
  sub,
  section,
  subIndex,
  subIds,
  ctx,
}: {
  sub: TreeSubfolder;
  section: TreeSection;
  subIndex: number;
  subIds: string[];
  ctx: Ctx;
}) {
  const { canEdit, filtering, handlers } = ctx;
  const [open, toggle] = useCollapse(`sf:${sub.id}`, false);
  const [hint, setHint] = useState<"into" | "before" | "after" | null>(null);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const isOpen = filtering || open;
  const cardIds = sub.apps.map((a) => a.id);

  function onDragOver(e: ReactDragEvent) {
    const d = currentDrag;
    if (!canEdit || !d) return;
    if (d.kind === "card") {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (hint !== "into") setHint("into");
    } else if (d.kind === "subfolder" && d.id !== sub.id) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const r = e.currentTarget.getBoundingClientRect();
      const edge = e.clientY < r.top + r.height / 2 ? "before" : "after";
      if (hint !== edge) setHint(edge);
    }
  }
  function onDrop(e: ReactDragEvent) {
    const d = currentDrag;
    const h = hint;
    setHint(null);
    if (!canEdit || !d) return;
    e.preventDefault();
    e.stopPropagation();
    if (d.kind === "card") handlers.onTreeDrop(d, { on: "subfolder", sub, mode: "into" });
    else if (d.kind === "subfolder" && d.id !== sub.id)
      handlers.onTreeDrop(d, { on: "subfolder", sub, mode: h === "before" ? "before" : "after" });
  }

  const nodes: ReactNode[] = sub.apps.map((card, i) => (
    <LeafRow
      key={`c-${card.id}`}
      card={card}
      index={i}
      count={cardIds.length}
      ctx={ctx}
      onMove={(dir) => handlers.onMoveCard(section.id, sub.id, cardIds, i, dir)}
    />
  ));

  if (canEdit && !filtering) {
    nodes.push(
      <AddRow
        key="add-card"
        label="tarjeta"
        onClick={() => handlers.onAddCard(section.id, sub.id)}
      />,
    );
  }

  return (
    <div style={{ opacity: dragging ? 0.4 : undefined }}>
      <div
        ref={rowRef}
        className="group relative flex items-center gap-1 rounded-lg"
        style={hintStyle(hint)}
        onDragOver={onDragOver}
        onDragLeave={() => setHint(null)}
        onDrop={onDrop}
      >
        {canEdit && (
          <span
            draggable
            aria-hidden
            title="Arrastrar para mover la subcarpeta"
            onDragStart={(e) => {
              e.stopPropagation();
              currentDrag = { kind: "subfolder", id: sub.id, sectionId: section.id };
              e.dataTransfer.effectAllowed = "move";
              if (rowRef.current) setDragGhost(e, rowRef.current);
              setDragging(true);
            }}
            onDragEnd={() => {
              currentDrag = null;
              setDragging(false);
            }}
            className="relative z-10 grid h-6 w-3.5 shrink-0 cursor-grab place-items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] active:cursor-grabbing"
          >
            <GripIcon />
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--row-hover)]"
        >
          <Chevron open={isOpen} small />
          <FolderIcon muted />
          <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {sub.label}
          </span>
          <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
            {sub.apps.length}
          </span>
        </button>

        {canEdit && (
          <span className="relative z-10 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <AdminBtn title="Editar subcarpeta" onClick={() => handlers.onEditSubfolder(sub)}>
              ✎
            </AdminBtn>
            <AdminBtn
              title="Subir subcarpeta"
              disabled={subIndex === 0}
              onClick={() => handlers.onMoveSubfolder(section.id, subIds, subIndex, -1)}
            >
              ↑
            </AdminBtn>
            <AdminBtn
              title="Bajar subcarpeta"
              disabled={subIndex === subIds.length - 1}
              onClick={() => handlers.onMoveSubfolder(section.id, subIds, subIndex, 1)}
            >
              ↓
            </AdminBtn>
          </span>
        )}
      </div>

      {isOpen && nodes.length > 0 && (
        <div className="tree-expand">
          <TreeList items={nodes} />
        </div>
      )}
    </div>
  );
}

function LeafRow({
  card,
  index,
  count,
  ctx,
  onMove,
}: {
  card: HubApp;
  index: number;
  count: number;
  ctx: Ctx;
  onMove: (dir: -1 | 1) => void;
}) {
  const { canEdit, handlers, activeSlug, openSlugs } = ctx;
  const active = activeSlug === card.slug;
  const open = !active && !!openSlugs?.has(card.slug);
  const opensInPane = card.embeddable;
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<"before" | "after" | null>(null);

  function onDragOver(e: ReactDragEvent) {
    const d = currentDrag;
    if (!canEdit || d?.kind !== "card" || d.id === card.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = e.currentTarget.getBoundingClientRect();
    const edge = e.clientY < r.top + r.height / 2 ? "before" : "after";
    if (hint !== edge) setHint(edge);
  }
  function onDrop(e: ReactDragEvent) {
    const d = currentDrag;
    const h = hint;
    setHint(null);
    if (!canEdit || d?.kind !== "card" || d.id === card.id) return;
    e.preventDefault();
    e.stopPropagation();
    handlers.onTreeDrop(d, { on: "card", card, edge: h === "before" ? "before" : "after" });
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Señal para soltar en una carpeta de "Tu espacio".
        e.dataTransfer.setData("application/x-hub-app", card.slug);
        e.dataTransfer.setData("text/plain", card.title);
        e.dataTransfer.effectAllowed = canEdit ? "copyMove" : "copy";
        // Señal para reubicar dentro del árbol compartido (solo en modo Editar).
        if (canEdit) {
          currentDrag = {
            kind: "card",
            id: card.id,
            sectionId: card.sectionId ?? "",
            subfolderId: card.subfolderId,
          };
        }
        setDragGhost(e, e.currentTarget);
        setDragging(true);
      }}
      onDragEnd={() => {
        currentDrag = null;
        setDragging(false);
      }}
      onDragOver={onDragOver}
      onDragLeave={() => setHint(null)}
      onDrop={onDrop}
      className="group relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors"
      style={{
        ...(active ? { background: "color-mix(in srgb, var(--brand-water) 16%, transparent)" } : {}),
        ...(dragging ? { opacity: 0.4 } : {}),
        ...hintStyle(hint),
      }}
    >
      <button
        type="button"
        draggable={false}
        onClick={() => handlers.onActivate(card)}
        className="absolute inset-0 rounded-lg hover:bg-[var(--row-hover)]"
        style={active ? { background: "transparent" } : undefined}
        aria-label={`Abrir ${card.title}`}
        aria-current={active ? "page" : undefined}
      />

      <span className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-2">
        <IconTile category={card.category} initial={card.initial} size={22} />
        <span
          className="truncate text-[13px]"
          style={{
            color: active || open ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: active ? 600 : 400,
          }}
        >
          {card.title}
        </span>
        {open && (
          <span
            aria-hidden
            title="Abierto en una pestaña"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--brand-water)" }}
          />
        )}
        <span
          aria-hidden
          className="shrink-0 text-[10px] text-[var(--text-muted)]"
          title={opensInPane ? "Se abre en el panel" : "Se abre en pestaña nueva"}
        >
          {opensInPane ? "⧉" : "↗"}
        </span>
      </span>

      <span className="relative flex shrink-0 items-center gap-1">
        <StatusMark status={card.status} />
        <button
          type="button"
          onClick={() => handlers.onInfo(card)}
          aria-label={`Detalles de ${card.title}`}
          className="relative z-10 grid h-6 w-6 place-items-center rounded-md text-[var(--text-muted)] opacity-0 transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)] group-hover:opacity-100"
        >
          <InfoIcon />
        </button>
        {canEdit && (
          <span className="relative z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <AdminBtn title="Subir tarjeta" disabled={index === 0} onClick={() => onMove(-1)}>
              ↑
            </AdminBtn>
            <AdminBtn title="Bajar tarjeta" disabled={index === count - 1} onClick={() => onMove(1)}>
              ↓
            </AdminBtn>
            <AdminBtn title="Editar tarjeta" onClick={() => handlers.onEditCard(card)}>
              ✎
            </AdminBtn>
          </span>
        )}
      </span>
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative z-10 flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-water)] hover:text-[var(--text-primary)]"
    >
      <span className="text-sm leading-none">+</span> {label}
    </button>
  );
}

// --- Conectores + lista ------------------------------------------------------

/** Envuelve cada hijo en una fila del árbol con su conector (codo redondeado + raíl). */
function TreeList({ items }: { items: ReactNode[] }) {
  const list = items.filter((x): x is ReactElement => isValidElement(x));
  return (
    <ul className="relative m-0 flex list-none flex-col p-0">
      {list.map((node, i) => (
        <li key={node.key ?? i} className="tree-node relative pl-[19px]">
          <Branch last={i === list.length - 1} />
          {node}
        </li>
      ))}
    </ul>
  );
}

function Branch({ last }: { last: boolean }) {
  return (
    <span aria-hidden className="tree-branch">
      <span className="tree-elbow absolute left-0 top-0 h-[18px] w-[12px] rounded-bl-[8px] border-b border-l" />
      {!last && <span className="tree-line absolute bottom-0 left-0 top-[18px] w-px" />}
    </span>
  );
}

// --- Piezas pequeñas --------------------------------------------------------

const STATUS_MARK: Record<AppStatus, { color: string; short: string }> = {
  live: { color: "var(--status-good)", short: "" },
  beta: { color: "var(--status-warning)", short: "Beta" },
  soon: { color: "var(--text-muted)", short: "Pronto" },
};

function StatusMark({ status }: { status: AppStatus }) {
  const m = STATUS_MARK[status];
  return (
    <span
      className="pointer-events-none flex items-center gap-1"
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
    >
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: m.color }} />
      {m.short && (
        <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: m.color }}>
          {m.short}
        </span>
      )}
    </span>
  );
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  const s = small ? 10 : 12;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="tree-chevron shrink-0 text-[var(--text-muted)]"
      data-open={open}
    >
      <path
        d="M6 3.5 11 8l-5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon({ color, muted = false }: { color?: string; muted?: boolean }) {
  const c = muted ? "var(--text-muted)" : color ?? "var(--brand-water)";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="shrink-0"
      style={{ color: c }}
    >
      <path
        d="M2.75 6.25A1.75 1.75 0 0 1 4.5 4.5h3.4a1.75 1.75 0 0 1 1.4.7l.75 1a1.75 1.75 0 0 0 1.4.7H15.5a1.75 1.75 0 0 1 1.75 1.75v5.1A1.75 1.75 0 0 1 15.5 16.5h-11A1.75 1.75 0 0 1 2.75 14.75V6.25Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[14px] w-[14px]" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.25v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.4" r="1" fill="currentColor" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 10 16" className="h-3.5 w-2.5" fill="currentColor" aria-hidden>
      <circle cx="3" cy="4" r="1.1" />
      <circle cx="7" cy="4" r="1.1" />
      <circle cx="3" cy="8" r="1.1" />
      <circle cx="7" cy="8" r="1.1" />
      <circle cx="3" cy="12" r="1.1" />
      <circle cx="7" cy="12" r="1.1" />
    </svg>
  );
}

// --- Estado de colapso (recordado por nodo en localStorage) ----------------

function useCollapse(id: string, defaultOpen: boolean) {
  const key = `hub:tree:v1:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      const v = localStorage.getItem(key);
      if (v === "0") setOpen(false);
      else if (v === "1") setOpen(true);
    } catch {
      // sin localStorage — se queda con el valor por defecto
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key]);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // sin persistencia
      }
      return next;
    });
  }, [key]);

  return [open, toggle] as const;
}
