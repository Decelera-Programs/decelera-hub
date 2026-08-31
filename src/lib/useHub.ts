"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppCategory, HubApp } from "./apps";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export type CategoryFilter = "Todos" | AppCategory;

export function useHub(apps: HubApp[]) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Todos");
  const [pinned, setPinned] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Lee el estado persistido solo tras montar, para no desincronizar el HTML del servidor.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync intencional con localStorage post-mount */
    try {
      setCategory((localStorage.getItem("hub:category") as CategoryFilter) || "Todos");
      setPinned(JSON.parse(localStorage.getItem("hub:pinned") ?? "[]"));
    } catch {
      // localStorage no disponible o corrupto — nos quedamos con los valores por defecto.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("hub:category", category);
  }, [category, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("hub:pinned", JSON.stringify(pinned));
  }, [pinned, hydrated]);

  const togglePin = (slug: string) =>
    setPinned((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));

  const tools = useMemo(
    () => apps.map((a) => ({ ...a, pinned: pinned.includes(a.slug) })),
    [apps, pinned],
  );

  const categories = useMemo<CategoryFilter[]>(() => {
    const present = Array.from(new Set(apps.map((a) => a.category)));
    return ["Todos", ...present];
  }, [apps]);

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return tools.filter(
      (t) =>
        (category === "Todos" || t.category === category) &&
        (!q || norm(`${t.title} ${t.description} ${t.category}`).includes(q)),
    );
  }, [tools, query, category]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Todos: apps.length };
    for (const a of apps) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [apps]);

  return {
    query,
    setQuery,
    category,
    setCategory,
    categories,
    visible,
    counts,
    togglePin,
    pinnedTools: tools.filter((t) => t.pinned),
  };
}
