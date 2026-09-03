export type AppStatus = "live" | "beta" | "soon";
export type AppCategory = "Dashboard" | "Herramienta" | "Datos";

export const CATEGORIES: AppCategory[] = ["Dashboard", "Herramienta", "Datos"];
export const STATUSES: AppStatus[] = ["live", "beta", "soon"];

/** Una sección de la home. Se gestiona desde la base de datos (`hub.sections`). */
export type Section = {
  id: string;
  label: string;
  blurb: string;
  accent: string;
  position: number;
};

/** Una tarjeta del hub. Se gestiona desde la base de datos (`hub.cards`). */
export type HubApp = {
  id: string;
  slug: string;
  sectionId: string | null;
  initial: string;
  title: string;
  description: string;
  href: string;
  category: AppCategory;
  status: AppStatus;
  meta?: string;
  /** true si `href` apunta a una app externa — se abre en pestaña nueva. */
  external: boolean;
  position: number;
};

export const STATUS_LABEL: Record<AppStatus, string> = {
  live: "Activo",
  beta: "Beta",
  soon: "Próximamente",
};

// Colores de acento disponibles para las secciones.
export const SECTION_ACCENTS: string[] = [
  "var(--brand-water)",
  "var(--brand-sea)",
  "var(--brand-sun)",
  "var(--brand-night)",
  "var(--series-2)",
  "var(--series-other)",
];

// Tinte del icono por categoría — ver --tile-*-bg/--tile-*-ink en globals.css.
export const CATEGORY_TINT: Record<AppCategory, { bg: string; ink: string }> = {
  Dashboard: { bg: "var(--tile-1-bg)", ink: "var(--tile-1-ink)" },
  Herramienta: { bg: "var(--tile-2-bg)", ink: "var(--tile-2-ink)" },
  Datos: { bg: "var(--tile-3-bg)", ink: "var(--tile-3-ink)" },
};
