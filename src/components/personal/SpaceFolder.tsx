"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { HubApp } from "@/lib/apps";
import type { Folder, FolderItem } from "@/lib/hub";
import {
  addFolderItem,
  deleteFolder,
  removeFolderItem,
  updateFolder,
} from "@/app/actions";
import { IconTile } from "@/components/HubPrimitives";

const COLORS = [
  "var(--brand-sea)",
  "var(--brand-water)",
  "var(--brand-sun)",
  "var(--series-2)",
  "var(--row-3)",
  "var(--series-other)",
];

function faviconFor(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return "";
  }
}

export function SpaceFolder({
  folder,
  apps,
  onDeleted,
}: {
  folder: Folder;
  apps: HubApp[];
  onDeleted: () => void;
}) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState<string | null>(folder.color);
  const [items, setItems] = useState<FolderItem[]>(folder.items);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDel(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function pickColor(c: string) {
    setColor(c);
    updateFolder(folder.id, { color: c });
  }
  function saveName() {
    updateFolder(folder.id, { name });
    setRenaming(false);
  }

  async function addApp(slug: string) {
    const row = await addFolderItem(folder.id, { kind: "app", appSlug: slug });
    setItems((it) => [...it, row]);
    setAdding(false);
  }
  async function addLink(url: string, label: string) {
    if (!url.trim()) return;
    const row = await addFolderItem(folder.id, { kind: "link", url, label });
    setItems((it) => [...it, row]);
    setAdding(false);
  }
  function removeItem(id: string) {
    setItems((it) => it.filter((x) => x.id !== id));
    removeFolderItem(id);
  }

  const usedSlugs = new Set(items.filter((i) => i.kind === "app").map((i) => i.app_slug));
  const available = apps.filter((a) => !usedSlugs.has(a.slug));

  return (
    <div
      className="card flex h-full flex-col gap-3 p-4 transition-shadow"
      style={
        dropActive
          ? { boxShadow: "0 0 0 2px var(--brand-water)", background: "color-mix(in srgb, var(--brand-water) 6%, var(--surface-1))" }
          : undefined
      }
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("application/x-hub-app")) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setDropActive(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
      }}
      onDrop={(e) => {
        const slug = e.dataTransfer.getData("application/x-hub-app");
        setDropActive(false);
        if (!slug) return;
        e.preventDefault();
        e.stopPropagation();
        if (usedSlugs.has(slug)) return;
        setCollapsed(false);
        addApp(slug);
      }}
    >
      <div
        className="flex cursor-pointer select-none items-center gap-2"
        onClick={() => {
          if (!renaming) setCollapsed((v) => !v);
        }}
      >
        <FolderGlyph color={color} />

        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(folder.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-[var(--surface-1)] px-1 text-sm font-semibold text-[var(--text-primary)] outline-none ring-1 ring-[var(--brand-water)]"
            maxLength={60}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {name || "Sin nombre"}
          </span>
        )}

        <span aria-hidden className="shrink-0 text-xs text-[var(--text-muted)]">
          {collapsed ? "▸" : "▾"}
        </span>

        <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirmDel(false);
            }}
            aria-label="Opciones de la carpeta"
            className="grid h-6 w-5 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-md">
              <button
                type="button"
                onClick={() => {
                  setRenaming(true);
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
              >
                Renombrar
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickColor(c)}
                    aria-label="Color"
                    className="h-4 w-4 rounded-full border border-[var(--border)] transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: color === c ? "2px solid var(--text-primary)" : "none",
                      outlineOffset: "1px",
                    }}
                  />
                ))}
              </div>
              {confirmDel ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteFolder(folder.id);
                    onDeleted();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm font-semibold text-[var(--status-critical)] transition-colors hover:bg-[var(--row-hover)]"
                >
                  Confirmar borrado
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDel(true)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--status-critical)]"
                >
                  Borrar carpeta
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <FolderItemRow
              key={it.id}
              item={it}
              app={it.kind === "app" ? apps.find((a) => a.slug === it.app_slug) : undefined}
              onRemove={() => removeItem(it.id)}
            />
          ))}

          {adding ? (
            <AddItemForm available={available} onAddApp={addApp} onAddLink={addLink} onCancel={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-0.5 self-start text-xs font-semibold text-[var(--brand-sea)]"
            >
              + Añadir
            </button>
          )}
          {items.length === 0 && !adding && (
            <p className="text-xs text-[var(--text-muted)]">Vacía — mete apps del hub o enlaces.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FolderGlyph({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
      style={{ background: color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--pill-neutral-bg)" }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M1.5 4.2c0-.66.54-1.2 1.2-1.2h3.05c.4 0 .77.2.99.53l.52.77c.22.33.6.53.99.53h4.55c.66 0 1.2.54 1.2 1.2v5.44c0 .66-.54 1.2-1.2 1.2H2.7c-.66 0-1.2-.54-1.2-1.2V4.2Z"
          fill={color ?? "var(--text-muted)"}
        />
      </svg>
    </span>
  );
}

function FolderItemRow({
  item,
  app,
  onRemove,
}: {
  item: FolderItem;
  app: HubApp | undefined;
  onRemove: () => void;
}) {
  const isApp = item.kind === "app";
  const href = isApp ? app?.href : item.url ?? "#";
  const label = isApp ? app?.title ?? item.app_slug ?? "?" : item.label ?? item.url ?? "?";
  const external = isApp ? app?.external : true;

  return (
    <div className="group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-[var(--row-hover)]">
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--text-primary)]"
      >
        {isApp && app ? (
          <IconTile category={app.category} initial={app.initial} size={20} />
        ) : (
          <img
            src={faviconFor(item.url ?? "")}
            alt=""
            width={18}
            height={18}
            referrerPolicy="no-referrer"
            className="shrink-0 rounded-[5px]"
          />
        )}
        <span className="truncate">{label}</span>
      </a>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar"
        className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--status-critical)] group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

function AddItemForm({
  available,
  onAddApp,
  onAddLink,
  onCancel,
}: {
  available: HubApp[];
  onAddApp: (slug: string) => void;
  onAddLink: (url: string, label: string) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<"app" | "link">(available.length > 0 ? "app" : "link");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2">
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("app")}
          className="rounded px-2 py-0.5 font-semibold"
          style={{
            background: tab === "app" ? "var(--pill-neutral-bg)" : "transparent",
            color: tab === "app" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          App del hub
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className="rounded px-2 py-0.5 font-semibold"
          style={{
            background: tab === "link" ? "var(--pill-neutral-bg)" : "transparent",
            color: tab === "link" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          Enlace
        </button>
      </div>

      {tab === "app" ? (
        available.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Ya están todas las apps en esta carpeta.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {available.map((a) => (
              <button
                key={a.slug}
                type="button"
                onClick={() => onAddApp(a.slug)}
                className="rounded px-2 py-1 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
              >
                {a.title}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nombre (opcional)"
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => onAddLink(url, label)}
            className="self-start rounded-md bg-[var(--brand-sea)] px-2.5 py-1 text-xs font-semibold text-white"
          >
            Añadir enlace
          </button>
        </div>
      )}

      <button type="button" onClick={onCancel} className="self-start text-xs text-[var(--text-muted)]">
        Cancelar
      </button>
    </div>
  );
}
