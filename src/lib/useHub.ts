"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppCategory, HubApp, Section } from "./apps";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export type CategoryFilter = "Todos" | AppCategory;

export function useHub(apps: HubApp[], sections: Section[]) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Todos");
  const [hydrated, setHydrated] = useState(false);

  // Lee el estado persistido solo tras montar, para no desincronizar el HTML del servidor.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync intencional con localStorage post-mount */
    try {
      setCategory((localStorage.getItem("hub:category") as CategoryFilter) || "Todos");
    } catch {
      // localStorage no disponible o corrupto — nos quedamos con los valores por defecto.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("hub:category", category);
  }, [category, hydrated]);

  const categories = useMemo<CategoryFilter[]>(() => {
    const present = Array.from(new Set(apps.map((a) => a.category)));
    return ["Todos", ...present];
  }, [apps]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Todos: apps.length };
    for (const a of apps) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [apps]);

  const q = norm(query.trim());
  const filtering = query.trim() !== "" || category !== "Todos";

  const visible = useMemo(
    () =>
      apps.filter(
        (t) =>
          (category === "Todos" || t.category === category) &&
          (!q || norm(`${t.title} ${t.description} ${t.category}`).includes(q)),
      ),
    [apps, q, category],
  );

  // Secciones en orden. Sin filtros se muestran todas (aunque estén vacías, para poder
  // añadirles tarjetas); con filtros activos se ocultan las que quedan sin resultados.
  const groups = useMemo(() => {
    const ordered = [...sections].sort((a, b) => a.position - b.position);
    const withApps = ordered.map((s) => ({
      ...s,
      apps: visible
        .filter((t) => t.sectionId === s.id)
        .slice()
        .sort((a, b) => a.position - b.position),
    }));
    return filtering ? withApps.filter((g) => g.apps.length > 0) : withApps;
  }, [sections, visible, filtering]);

  return {
    query,
    setQuery,
    category,
    setCategory,
    categories,
    counts,
    groups,
    filtering,
    visibleCount: visible.length,
    totalCount: apps.length,
  };
}
