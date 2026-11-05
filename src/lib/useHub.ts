"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppCategory, HubApp, Section, Subfolder } from "./apps";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export type CategoryFilter = "Todos" | AppCategory;

/** Subcarpeta con sus tarjetas ya resueltas y ordenadas, y sus subcarpetas hijas (3.er nivel). */
export type TreeSubfolder = Subfolder & { apps: HubApp[]; children: TreeSubfolder[]; count: number };

/** Sección con su subárbol: subcarpetas + tarjetas sueltas (directas en la sección). */
export type TreeSection = Section & {
  subfolders: TreeSubfolder[];
  apps: HubApp[];
  /** Total de tarjetas visibles bajo la sección (sueltas + dentro de subcarpetas). */
  count: number;
};

export function useHub(apps: HubApp[], sections: Section[], subfolders: Subfolder[]) {
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
          (!q || norm(`${t.title} ${t.description} ${t.category} ${t.meta ?? ""}`).includes(q)),
      ),
    [apps, q, category],
  );

  // Árbol: secciones en orden → subcarpetas en orden (cada una con sus tarjetas) +
  // tarjetas sueltas de la sección. Sin filtros se muestra todo (aunque haya nodos
  // vacíos, para poder añadirles contenido); con filtros se podan las ramas vacías.
  const groups = useMemo<TreeSection[]>(() => {
    const byPosSf = (x: Subfolder, y: Subfolder) => x.position - y.position;
    const childrenOf = new Map<string, Subfolder[]>();
    const topBySection = new Map<string, Subfolder[]>();
    for (const sf of [...subfolders].sort(byPosSf)) {
      const map = sf.parentId ? childrenOf : topBySection;
      const key = sf.parentId ?? sf.sectionId;
      const list = map.get(key) ?? [];
      list.push(sf);
      map.set(key, list);
    }

    const byPos = (a: HubApp, b: HubApp) => a.position - b.position;

    const build = (sf: Subfolder): TreeSubfolder => {
      const children = (childrenOf.get(sf.id) ?? []).map(build);
      const own = visible.filter((t) => t.subfolderId === sf.id).sort(byPos);
      return { ...sf, apps: own, children, count: own.length + children.reduce((n, c) => n + c.count, 0) };
    };

    const tree = [...sections]
      .sort((a, b) => a.position - b.position)
      .map<TreeSection>((s) => {
        const subs = (topBySection.get(s.id) ?? []).map(build);
        const direct = visible
          .filter((t) => t.sectionId === s.id && !t.subfolderId)
          .sort(byPos);
        const count = direct.length + subs.reduce((n, sf) => n + sf.count, 0);
        return { ...s, subfolders: subs, apps: direct, count };
      });

    if (!filtering) return tree;
    return tree
      .filter((g) => g.count > 0)
      .map((g) => ({
        ...g,
        subfolders: g.subfolders
          .map((sf) => ({ ...sf, children: sf.children.filter((c) => c.count > 0) }))
          .filter((sf) => sf.count > 0),
      }));
  }, [sections, subfolders, visible, filtering]);

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
