export type AppStatus = "live" | "beta" | "soon";
export type AppCategory = "Dashboard" | "Herramienta" | "Datos";

export type HubApp = {
  slug: string;
  initial: string;
  title: string;
  description: string;
  href: string;
  category: AppCategory;
  status: AppStatus;
  meta?: string;
};

export const STATUS_LABEL: Record<AppStatus, string> = {
  live: "Activo",
  beta: "Beta",
  soon: "Próximamente",
};

// Tinte del icono por categoría — ver --tile-*-bg/--tile-*-ink en globals.css.
export const CATEGORY_TINT: Record<AppCategory, { bg: string; ink: string }> = {
  Dashboard: { bg: "var(--tile-1-bg)", ink: "var(--tile-1-ink)" },
  Herramienta: { bg: "var(--tile-2-bg)", ink: "var(--tile-2-ink)" },
  Datos: { bg: "var(--tile-3-bg)", ink: "var(--tile-3-ink)" },
};

// Cada nueva feature del hub se añade aquí: un tile más en la pantalla de inicio.
export const hubApps: HubApp[] = [
  {
    slug: "opencall-mexico-2026",
    initial: "OM",
    title: "Opencall México 2026",
    description:
      "Seguimiento del deal flow: canal de entrada, conversión por etapa del funnel y volumen semanal de aplicaciones.",
    href: "/opencall-mexico-2026",
    category: "Dashboard",
    status: "live",
    meta: "Datos en vivo",
  },
];

// Número de tiles "próximamente" genéricos para comunicar que el hub va a crecer.
// No participan en la búsqueda ni en los filtros de categoría.
export const COMING_SOON_SLOTS = 2;
