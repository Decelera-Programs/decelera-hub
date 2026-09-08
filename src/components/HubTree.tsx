"use client";

import {
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { STATUS_LABEL, type AppStatus, type HubApp } from "@/lib/apps";
import type { TreeSection, TreeSubfolder } from "@/lib/useHub";
import { AdminBtn } from "./hub-admin/editorUi";
import { IconTile } from "./HubPrimitives";

export type HubTreeHandlers = {
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
};

/**
 * Home del hub como árbol colapsable, al estilo de los diagramas de estructura de un
 * README pero con la estética del hub: cada sección es una carpeta; dentro cuelgan
 * subcarpetas y tarjetas unidas por conectores redondeados. El detalle de cada tarjeta
 * vive en un pop-up (botón de info) para que las filas queden compactas.
 */
export function HubTree({
  groups,
  canEdit,
  filtering,
  handlers,
}: {
  groups: TreeSection[];
  canEdit: boolean;
  filtering: boolean;
  handlers: HubTreeHandlers;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((section, i) => (
        <SectionNode
          key={section.id}
          section={section}
          index={i}
          total={groups.length}
          canEdit={canEdit}
          filtering={filtering}
          handlers={handlers}
        />
      ))}
    </div>
  );
}

// --- Nodos ---------------------------------------------------------------------

function SectionNode({
  section,
  index,
  total,
  canEdit,
  filtering,
  handlers,
}: {
  section: TreeSection;
  index: number;
  total: number;
  canEdit: boolean;
  filtering: boolean;
  handlers: HubTreeHandlers;
}) {
  const [open, toggle] = useCollapse(`sec:${section.id}`, true);
  const isOpen = filtering || open;
  const accent = section.accent;

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
        canEdit={canEdit}
        filtering={filtering}
        handlers={handlers}
      />
    )),
    ...section.apps.map((card, i) => (
      <LeafRow
        key={`c-${card.id}`}
        card={card}
        index={i}
        count={directIds.length}
        canEdit={canEdit}
        onInfo={() => handlers.onInfo(card)}
        onEdit={() => handlers.onEditCard(card)}
        onMove={(dir) => handlers.onMoveCard(section.id, null, directIds, i, dir)}
      />
    )),
  ];

  if (canEdit && !filtering) {
    nodes.push(
      <AddRow key="add-sf" label="subcarpeta" onClick={() => handlers.onAddSubfolder(section.id)} />,
      <AddRow
        key="add-card"
        label="tarjeta"
        onClick={() => handlers.onAddCard(section.id, null)}
      />,
    );
  }

  return (
    <div className="card hub-reveal overflow-hidden" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="relative flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Chevron open={isOpen} />
          <FolderIcon color={accent} />
          <span className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
            {section.label}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              color: accent,
            }}
          >
            {section.count}
          </span>
          {section.blurb && (
            <span className="hidden min-w-0 truncate text-xs text-[var(--text-muted)] sm:inline">
              — {section.blurb}
            </span>
          )}
        </button>

        {canEdit && (
          <span className="relative z-10 flex shrink-0 items-center gap-0.5">
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
        <div className="tree-expand px-3 pb-3 pl-6">
          {nodes.length > 0 ? (
            <TreeList items={nodes} />
          ) : (
            <p className="py-1 pl-1 text-xs text-[var(--text-muted)]">Sin herramientas todavía.</p>
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
  canEdit,
  filtering,
  handlers,
}: {
  sub: TreeSubfolder;
  section: TreeSection;
  subIndex: number;
  subIds: string[];
  canEdit: boolean;
  filtering: boolean;
  handlers: HubTreeHandlers;
}) {
  const [open, toggle] = useCollapse(`sf:${sub.id}`, false);
  const isOpen = filtering || open;
  const cardIds = sub.apps.map((a) => a.id);

  const nodes: ReactNode[] = sub.apps.map((card, i) => (
    <LeafRow
      key={`c-${card.id}`}
      card={card}
      index={i}
      count={cardIds.length}
      canEdit={canEdit}
      onInfo={() => handlers.onInfo(card)}
      onEdit={() => handlers.onEditCard(card)}
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
    <div>
      <div className="group relative flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--row-hover)]"
        >
          <Chevron open={isOpen} small />
          <FolderIcon muted />
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {sub.label}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-[var(--text-muted)]">
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
  canEdit,
  onInfo,
  onEdit,
  onMove,
}: {
  card: HubApp;
  index: number;
  count: number;
  canEdit: boolean;
  onInfo: () => void;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="group relative flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--row-hover)]">
      <Link
        href={card.href}
        {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="absolute inset-0 rounded-lg"
        aria-label={`Abrir ${card.title}`}
      />

      <span className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-2">
        <IconTile category={card.category} initial={card.initial} size={24} />
        <span className="truncate text-sm text-[var(--text-primary)]">{card.title}</span>
        {card.meta && (
          <span className="hidden shrink-0 truncate text-[11px] text-[var(--text-muted)] md:inline">
            {card.meta}
          </span>
        )}
        {card.external && (
          <span aria-hidden className="shrink-0 text-[11px] text-[var(--text-muted)]">
            ↗
          </span>
        )}
      </span>

      <span className="relative flex shrink-0 items-center gap-1.5">
        <StatusMark status={card.status} />
        <button
          type="button"
          onClick={onInfo}
          aria-label={`Detalles de ${card.title}`}
          className="relative z-10 grid h-6 w-6 place-items-center rounded-md text-[var(--text-muted)] opacity-70 transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)] hover:opacity-100"
        >
          <InfoIcon />
        </button>
        {canEdit && (
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <AdminBtn title="Subir tarjeta" disabled={index === 0} onClick={() => onMove(-1)}>
              ↑
            </AdminBtn>
            <AdminBtn
              title="Bajar tarjeta"
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              ↓
            </AdminBtn>
            <AdminBtn title="Editar tarjeta" onClick={onEdit}>
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
        <li key={node.key ?? i} className="tree-node relative pl-[21px]">
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
      <span
        className="tree-elbow absolute left-0 top-0 h-[20px] w-[13px] rounded-bl-[9px] border-b border-l"
      />
      {!last && <span className="tree-line absolute bottom-0 left-0 top-[20px] w-px" />}
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
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: m.color }}
        >
          {m.short}
        </span>
      )}
    </span>
  );
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  const s = small ? 11 : 13;
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
      width="15"
      height="15"
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
    <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.25v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.4" r="1" fill="currentColor" />
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
