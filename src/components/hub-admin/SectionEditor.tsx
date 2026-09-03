"use client";

import { useState, useTransition } from "react";
import { SECTION_ACCENTS, type Section } from "@/lib/apps";
import { deleteSection, updateSection } from "@/app/actions";
import { Overlay, fieldCls, labelCls } from "./editorUi";

export function SectionEditor({ section, onClose }: { section: Section; onClose: () => void }) {
  const [label, setLabel] = useState(section.label);
  const [blurb, setBlurb] = useState(section.blurb);
  const [accent, setAccent] = useState(section.accent);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (!label.trim()) return;
    start(async () => {
      await updateSection(section.id, { label, blurb, accent });
      onClose();
    });
  }
  function remove() {
    start(async () => {
      await deleteSection(section.id);
      onClose();
    });
  }

  return (
    <Overlay title="Editar sección" onClose={onClose}>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Nombre</span>
        <input autoFocus className={fieldCls} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Descripción</span>
        <input className={fieldCls} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
      </label>
      <div className="flex flex-col gap-1">
        <span className={labelCls}>Color</span>
        <div className="flex gap-2">
          {SECTION_ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label="Color"
              onClick={() => setAccent(c)}
              className="h-6 w-6 rounded-full border border-[var(--border)] transition-transform hover:scale-110"
              style={{ background: c, outline: accent === c ? "2px solid var(--text-primary)" : "none", outlineOffset: "1px" }}
            />
          ))}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        {confirmDel ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-sm font-semibold text-[var(--status-critical)] disabled:opacity-50"
          >
            Confirmar borrado (y sus tarjetas)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--status-critical)]"
          >
            Borrar sección
          </button>
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
            disabled={pending || !label.trim()}
            className="rounded-lg bg-[var(--brand-sea)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </Overlay>
  );
}
