"use client";

import { useState, useTransition } from "react";
import type { Subfolder } from "@/lib/apps";
import { deleteSubfolder, updateSubfolder } from "@/app/actions";
import { Overlay, fieldCls, labelCls } from "./editorUi";

export function SubfolderEditor({
  subfolder,
  onClose,
}: {
  subfolder: Subfolder;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(subfolder.label);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (!label.trim()) return;
    start(async () => {
      await updateSubfolder(subfolder.id, { label });
      onClose();
    });
  }
  function remove() {
    start(async () => {
      await deleteSubfolder(subfolder.id);
      onClose();
    });
  }

  return (
    <Overlay title="Editar subcarpeta" onClose={onClose}>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Nombre</span>
        <input autoFocus className={fieldCls} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <p className="text-xs text-[var(--text-muted)]">
        Al borrar la subcarpeta, sus tarjetas vuelven al nivel de la sección (no se pierden).
      </p>

      <div className="mt-1 flex items-center justify-between">
        {confirmDel ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-sm font-semibold text-[var(--status-critical)] disabled:opacity-50"
          >
            Confirmar borrado
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--status-critical)]"
          >
            Borrar subcarpeta
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
