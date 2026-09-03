"use client";

import { useEffect, useRef, useState } from "react";
import type { Widget } from "@/lib/hub";
import { deleteWidget, updateWidget } from "@/app/actions";

export function SpaceWidget({ widget, onDeleted }: { widget: Widget; onDeleted: () => void }) {
  const [title, setTitle] = useState(widget.title ?? "");
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="card flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateWidget(widget.id, { title })}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none"
          maxLength={60}
        />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {widget.kind === "note" ? "Nota" : widget.kind === "links" ? "Enlaces" : "To-do"}
        </span>
        {confirmDel ? (
          <button
            type="button"
            onClick={() => {
              deleteWidget(widget.id);
              onDeleted();
            }}
            className="text-xs font-semibold text-[var(--status-critical)]"
          >
            Borrar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            onBlur={() => setConfirmDel(false)}
            aria-label="Borrar widget"
            className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--status-critical)]"
          >
            ✕
          </button>
        )}
      </div>

      {widget.kind === "note" && <NoteBody widget={widget} />}
      {widget.kind === "links" && <LinksBody widget={widget} />}
      {widget.kind === "todo" && <TodoBody widget={widget} />}
    </div>
  );
}

/** Guarda `data` con debounce; el estado local es la fuente de verdad en sesión. */
function useDebouncedData<T>(widgetId: string, initial: T, delay = 700) {
  const [value, setValue] = useState<T>(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      updateWidget(widgetId, { data: value as unknown });
    }, delay);
    return () => clearTimeout(t);
  }, [value, widgetId, delay]);
  return [value, setValue] as const;
}

function NoteBody({ widget }: { widget: Widget }) {
  const initial = typeof widget.data.text === "string" ? widget.data.text : "";
  const [data, setData] = useDebouncedData(widget.id, { text: initial });
  return (
    <textarea
      value={data.text}
      onChange={(e) => setData({ text: e.target.value })}
      placeholder="Escribe aquí…"
      className="min-h-28 flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
    />
  );
}

type Link = { label: string; url: string };

function LinksBody({ widget }: { widget: Widget }) {
  const initial = Array.isArray(widget.data.items) ? (widget.data.items as Link[]) : [];
  const [data, setData] = useDebouncedData(widget.id, { items: initial });
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const set = (items: Link[]) => setData({ items });
  const add = () => {
    if (!url.trim()) return;
    const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    set([...data.items, { url: u, label: label.trim() || u }]);
    setUrl("");
    setLabel("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {data.items.map((it, i) => (
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
            onClick={() => set(data.items.filter((_, j) => j !== i))}
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
  const [data, setData] = useDebouncedData(widget.id, { items: initial });
  const [text, setText] = useState("");

  const set = (items: Task[]) => setData({ items });
  const add = () => {
    if (!text.trim()) return;
    set([...data.items, { text: text.trim(), done: false }]);
    setText("");
  };

  return (
    <div className="flex flex-col gap-1">
      {data.items.map((t, i) => (
        <div key={i} className="group flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() =>
              set(data.items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
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
            onClick={() => set(data.items.filter((_, j) => j !== i))}
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
