"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, STATUSES, STATUS_LABEL, type HubApp, type Section } from "@/lib/apps";
import { createCard, deleteCard, updateCard } from "@/app/actions";
import { Overlay, fieldCls, labelCls } from "./editorUi";

type Draft = {
  title: string;
  initial: string;
  href: string;
  description: string;
  meta: string;
  category: HubApp["category"];
  status: HubApp["status"];
  external: boolean;
  sectionId: string;
};

function draftFrom(card: HubApp | null, sectionId: string): Draft {
  return {
    title: card?.title ?? "",
    initial: card?.initial ?? "",
    href: card?.href ?? "",
    description: card?.description ?? "",
    meta: card?.meta ?? "",
    category: card?.category ?? "Herramienta",
    status: card?.status ?? "live",
    external: card?.external ?? true,
    sectionId: card?.sectionId ?? sectionId,
  };
}

export function CardEditor({
  card,
  sectionId,
  sections,
  onClose,
}: {
  card: HubApp | null;
  sectionId: string;
  sections: Section[];
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(() => draftFrom(card, sectionId));
  const [pending, start] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  function save() {
    if (!d.title.trim() || !d.href.trim()) return;
    start(async () => {
      const payload = {
        title: d.title,
        initial: d.initial,
        href: d.href,
        description: d.description,
        meta: d.meta,
        category: d.category,
        status: d.status,
        external: d.external,
      };
      if (card) await updateCard(card.id, { ...payload, sectionId: d.sectionId });
      else await createCard(d.sectionId, payload);
      onClose();
    });
  }

  function remove() {
    if (!card) return;
    start(async () => {
      await deleteCard(card.id);
      onClose();
    });
  }

  return (
    <Overlay title={card ? "Editar tarjeta" : "Nueva tarjeta"} onClose={onClose}>
      <div className="grid grid-cols-[1fr_84px] gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Título</span>
          <input autoFocus className={fieldCls} value={d.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Iniciales</span>
          <input
            className={fieldCls}
            value={d.initial}
            maxLength={3}
            placeholder="AB"
            onChange={(e) => set("initial", e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Enlace</span>
        <input
          className={fieldCls}
          value={d.href}
          placeholder="https://…  o  /ruta-interna"
          onChange={(e) => {
            const v = e.target.value;
            setD((p) => ({ ...p, href: v, external: /^https?:\/\//i.test(v.trim()) }));
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Descripción</span>
        <textarea
          className={`${fieldCls} min-h-16 resize-y`}
          value={d.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Etiqueta (meta)</span>
          <input
            className={fieldCls}
            value={d.meta}
            placeholder="Drive, Datos en vivo…"
            onChange={(e) => set("meta", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Categoría</span>
          <select
            className={fieldCls}
            value={d.category}
            onChange={(e) => set("category", e.target.value as Draft["category"])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Estado</span>
          <select
            className={fieldCls}
            value={d.status}
            onChange={(e) => set("status", e.target.value as Draft["status"])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Sección</span>
          <select
            className={fieldCls}
            value={d.sectionId}
            onChange={(e) => set("sectionId", e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={d.external}
          onChange={(e) => set("external", e.target.checked)}
          className="accent-[var(--brand-sea)]"
        />
        Abre en pestaña nueva
      </label>

      <div className="mt-1 flex items-center justify-between">
        {card ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-sm font-semibold text-[var(--status-critical)] disabled:opacity-50"
          >
            Borrar
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !d.title.trim() || !d.href.trim()}
            className="rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {card ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
