"use client";

import { useEffect, useMemo, useState } from "react";
import { HUB_GROUPS, type HubApp } from "./apps";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export type HubAppView = HubApp & { pinned: boolean };

export function useHub(apps: HubApp[]) {
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Lee el estado persistido solo tras montar, para no desincronizar el HTML del servidor.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync intencional con localStorage post-mount */
    try {
      setPinned(JSON.parse(localStorage.getItem("hub:pinned") ?? "[]"));
    } catch {
      // localStorage no disponible o corrupto — nos quedamos con los valores por defecto.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("hub:pinned", JSON.stringify(pinned));
  }, [pinned, hydrated]);

  const togglePin = (slug: string) =>
    setPinned((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));

  const tools = useMemo<HubAppView[]>(
    () => apps.map((a) => ({ ...a, pinned: pinned.includes(a.slug) })),
    [apps, pinned],
  );

  const q = norm(query.trim());
  const visible = useMemo(
    () => tools.filter((t) => !q || norm(`${t.title} ${t.description} ${t.category} ${t.group}`).includes(q)),
    [tools, q],
  );

  // Secciones en el orden de HUB_GROUPS, saltando las que quedan vacías con la búsqueda actual.
  const groups = useMemo(
    () =>
      HUB_GROUPS.map((g) => ({ ...g, apps: visible.filter((t) => t.group === g.id) })).filter(
        (g) => g.apps.length > 0,
      ),
    [visible],
  );

  return {
    query,
    setQuery,
    groups,
    visibleCount: visible.length,
    totalCount: apps.length,
    togglePin,
    pinnedTools: tools.filter((t) => t.pinned),
  };
}
