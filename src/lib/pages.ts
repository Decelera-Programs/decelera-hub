/**
 * Páginas del hub que aparecen en el selector de arriba. Por ahora todo el mundo
 * las ve todas; el modelo de acceso fino (por equipo / rol) se añadirá más adelante.
 */
export type HubPage = { key: string; label: string; href: string };

export const HUB_PAGES: HubPage[] = [
  { key: "workspace", label: "Herramientas", href: "/" },
  { key: "proyectos", label: "Proyectos", href: "/proyectos" },
];

/** Página activa a partir del pathname. */
export function currentPage(pathname: string): HubPage {
  return (
    HUB_PAGES.find((p) =>
      p.href === "/" ? pathname === "/" : pathname === p.href || pathname.startsWith(`${p.href}/`),
    ) ?? HUB_PAGES[0]
  );
}
