"use client";

import { useEffect, useState, useTransition } from "react";
import type { HubApp } from "@/lib/apps";
import {
  getCardAccess,
  listMembersForAccess,
  setCardAccess,
  type CardAccessMember,
} from "@/app/actions";
import { labelCls } from "./editorUi";

/** Panel del editor de tarjetas para elegir qué miembros pueden ver una tarjeta restringida. */
export function AccessControl({ card }: { card: HubApp }) {
  const [members, setMembers] = useState<CardAccessMember[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  useEffect(() => {
    let active = true;
    Promise.all([listMembersForAccess(), getCardAccess(card.slug)]).then(([ms, granted]) => {
      if (!active) return;
      setMembers(ms);
      setSelected(new Set(granted));
    });
    return () => {
      active = false;
    };
  }, [card.slug]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    start(async () => {
      await setCardAccess(card.slug, Array.from(next));
    });
  }

  if (!members) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] p-3">
      <span className={labelCls}>Acceso restringido</span>
      <p className="text-xs text-[var(--text-muted)]">
        {selected.size === 0
          ? "Sin restricción: la ve todo el equipo."
          : `Solo ${selected.size} persona(s) marcada(s) (y los admins) la ven.`}
      </p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              disabled={pending}
              onChange={() => toggle(m.id)}
              className="accent-[var(--brand-sea)]"
            />
            {m.fullName || m.email}
          </label>
        ))}
      </div>
    </div>
  );
}
