"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Widget } from "@/lib/hub";
import { deleteWidget, updateWidget } from "@/app/actions";
import { CardMenu } from "./CardMenu";

const KIND_LABEL: Record<Widget["kind"], string> = {
  note: "Nota",
  links: "Enlaces",
  todo: "To-do",
};
const KIND_COLOR: Record<Widget["kind"], string> = {
  note: "var(--brand-sun)",
  links: "var(--brand-water)",
  todo: "var(--brand-sea)",
};

const collapseKey = (id: string) => `hub:w:${id}:collapsed`;

export function SpaceWidget({ widget, onDeleted }: { widget: Widget; onDeleted: () => void }) {
  const [title, setTitle] = useState(widget.title ?? "");
  // Por defecto colapsado; se recuerda por widget en localStorage. Se arranca en `true`
  // para no desincronizar el HTML del servidor; el valor real se lee tras montar.
  const [collapsed, setCollapsed] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync post-mount con localStorage */
    try {
      if (localStorage.getItem(collapseKey(widget.id)) === "0") setCollapsed(false);
    } catch {
      // localStorage no disponible — nos quedamos colapsados.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [widget.id]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(collapseKey(widget.id), next ? "1" : "0");
    } catch {
      // sin persistencia — al menos cambia en esta sesión.
    }
  }

  function saveName() {
    updateWidget(widget.id, { title });
    setRenaming(false);
  }

  return (
    <div className="card relative flex h-full flex-col gap-3 p-4">
      <div
        className="flex cursor-pointer select-none items-center gap-2"
        onClick={() => {
          if (!renaming) toggleCollapsed();
        }}
      >
        <WidgetGlyph kind={widget.kind} />

        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setTitle(widget.title ?? "");
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-[var(--surface-1)] px-1 text-sm font-semibold text-[var(--text-primary)] outline-none ring-1 ring-[var(--brand-water)]"
            maxLength={60}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {title || "Sin título"}
          </span>
        )}

        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {KIND_LABEL[widget.kind]}
        </span>
        <span aria-hidden className="shrink-0 text-xs text-[var(--text-muted)]">
          {collapsed ? "▸" : "▾"}
        </span>

        <CardMenu label="Opciones del widget" onClose={() => setConfirmDel(false)}>
          {(close) => (
            <>
              <button
                type="button"
                onClick={() => {
                  setRenaming(true);
                  close();
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
              >
                Renombrar
              </button>
              {confirmDel ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteWidget(widget.id);
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
                  Borrar widget
                </button>
              )}
            </>
          )}
        </CardMenu>
      </div>

      {/* `hidden` en vez de desmontar: al colapsar no se pierde el guardado con debounce pendiente. */}
      <div hidden={collapsed} className="flex flex-1 flex-col">
        {widget.kind === "note" && <NoteBody widget={widget} />}
        {widget.kind === "links" && <LinksBody widget={widget} />}
        {widget.kind === "todo" && <TodoBody widget={widget} />}
      </div>
    </div>
  );
}

function WidgetGlyph({ kind }: { kind: Widget["kind"] }) {
  const color = KIND_COLOR[kind];
  return (
    <span
      aria-hidden
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "note" && (
          <>
            <path d="M4 2.5h8v11H4z" />
            <path d="M6 6h4M6 9h3" />
          </>
        )}
        {kind === "links" && (
          <>
            <path d="m6.4 9.6 3.2-3.2" />
            <path d="M8.2 4.6 9.3 3.5a2.4 2.4 0 0 1 3.4 3.4l-1.1 1.1" />
            <path d="M7.8 11.4 6.7 12.5a2.4 2.4 0 0 1-3.4-3.4l1.1-1.1" />
          </>
        )}
        {kind === "todo" && (
          <>
            <path d="M3 3.5h10v9H3z" />
            <path d="m5.5 8 2 2 3.5-4" />
          </>
        )}
      </svg>
    </span>
  );
}

/**
 * Estado local = fuente de verdad en sesión. Dos formas de persistir en `hub.widgets.data`:
 * - `setDebounced`: para texto que se teclea (la nota). Agrupa escrituras; `flush()` fuerza
 *   el guardado pendiente ya — se llama al desmontar y en el `blur` del campo.
 * - `setNow`: para cambios puntuales (añadir/borrar/marcar). Guarda al instante, sin ventana.
 */
function useWidgetData<T>(widgetId: string, initial: T, delay = 500) {
  const [value, setValue] = useState<T>(initial);
  const valueRef = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    updateWidget(widgetId, { data: valueRef.current as unknown });
  }, [widgetId]);

  const setDebounced = useCallback(
    (next: T) => {
      valueRef.current = next;
      setValue(next);
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  const setNow = useCallback(
    (next: T) => {
      valueRef.current = next;
      setValue(next);
      dirty.current = true;
      flush();
    },
    [flush],
  );

  useEffect(() => flush, [flush]); // flush al desmontar (colapsar oculta, no desmonta)

  return { value, setDebounced, setNow, flush };
}

function NoteBody({ widget }: { widget: Widget }) {
  const initial = typeof widget.data.text === "string" ? widget.data.text : "";
  const { value, setDebounced, flush } = useWidgetData(widget.id, { text: initial });
  return (
    <textarea
      value={value.text}
      onChange={(e) => setDebounced({ text: e.target.value })}
      onBlur={flush}
      placeholder="Escribe aquí…"
      className="min-h-28 flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
    />
  );
}

type Link = { label: string; url: string };

function LinksBody({ widget }: { widget: Widget }) {
  const initial = Array.isArray(widget.data.items) ? (widget.data.items as Link[]) : [];
  const { value, setNow } = useWidgetData(widget.id, { items: initial });
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const set = (items: Link[]) => setNow({ items });
  const add = () => {
    if (!url.trim()) return;
    const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    set([...value.items, { url: u, label: label.trim() || u }]);
    setUrl("");
    setLabel("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {value.items.map((it, i) => (
        <div key={i} className="group flex items-center gap-2 text-sm">
          <a
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[var(--text-primary)] hover:text-[var(--brand-sea)]"
          >
            {it.label}
          </a>
          <button
            type="button"
            onClick={() => set(value.items.filter((_, j) => j !== i))}
            aria-label="Quitar"
            className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--status-critical)] group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="mt-1 flex flex-col gap-1.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
        />
        <div className="flex gap-1.5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nombre"
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={add}
            className="shrink-0 rounded-md bg-[var(--brand-sea)] px-2.5 py-1 text-xs font-semibold text-white"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

type Task = { text: string; done: boolean };

function TodoBody({ widget }: { widget: Widget }) {
  const initial = Array.isArray(widget.data.items) ? (widget.data.items as Task[]) : [];
  const { value, setNow } = useWidgetData(widget.id, { items: initial });
  const [text, setText] = useState("");

  const set = (items: Task[]) => setNow({ items });
  const add = () => {
    if (!text.trim()) return;
    set([...value.items, { text: text.trim(), done: false }]);
    setText("");
  };

  return (
    <div className="flex flex-col gap-1">
      {value.items.map((t, i) => (
        <div key={i} className="group flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() =>
              set(value.items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
            }
            className="accent-[var(--brand-sea)]"
          />
          <span
            className={`min-w-0 flex-1 truncate ${
              t.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
            }`}
          >
            {t.text}
          </span>
          <button
            type="button"
            onClick={() => set(value.items.filter((_, j) => j !== i))}
            aria-label="Quitar"
            className="text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--status-critical)] group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="mt-1 flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva tarea"
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-sm outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-md bg-[var(--brand-sea)] px-2.5 py-1 text-xs font-semibold text-white"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
