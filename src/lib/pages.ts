/**
 * Páginas del hub que aparecen en el selector de arriba. Por ahora todo el mundo
 * las ve todas; el modelo de acceso fino (por equipo / rol) se añadirá más adelante.
 */
export type HubPage = { key: string; label: string; href: string };

export const HUB_PAGES: HubPage[] = [
  // "Preguntar" es la página de inicio: la raíz (/) redirige aquí; también es el destino tras entrar y al abrir la app.
  { key: "brain", label: "Preguntar", href: "/brain" },
  { key: "workspace", label: "Herramientas", href: "/herramientas" },
  { key: "estrategia", label: "Estrategia", href: "/estrategia" },
  { key: "proyectos", label: "Proyectos", href: "/proyectos" },
  // Bitácora oculta por ahora (la página /bitacora y sus datos siguen ahí). Para volver a mostrarla:
  // { key: "bitacora", label: "Bitácora", href: "/bitacora" },
  { key: "calendario", label: "Calendario", href: "/calendario" },
  { key: "agentes", label: "Agentes", href: "/agentes" },
];

/** Página activa a partir del pathname. */
export function currentPage(pathname: string): HubPage {
  return (
    HUB_PAGES.find((p) =>
      p.href === "/" ? pathname === "/" : pathname === p.href || pathname.startsWith(`${p.href}/`),
    ) ?? HUB_PAGES.find((p) => p.key === "workspace")!
  );
}
