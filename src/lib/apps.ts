export type AppStatus = "live" | "beta" | "soon";
export type AppCategory = "Dashboard" | "Herramienta" | "Datos";
export type AppGroup = "General View" | "Investment";

export type HubApp = {
  slug: string;
  initial: string;
  title: string;
  description: string;
  href: string;
  category: AppCategory;
  group: AppGroup;
  status: AppStatus;
  meta?: string;
  /** true si `href` apunta a una app externa — se abre en pestaña nueva. */
  external?: boolean;
};

/** Secciones de la home, en orden de aparición. Cada tarjeta declara su `group`. */
export const HUB_GROUPS: { id: AppGroup; label: string; blurb: string; accent: string }[] = [
  {
    id: "General View",
    label: "General View",
    blurb: "Visión operativa transversal del equipo.",
    accent: "var(--brand-water)",
  },
  {
    id: "Investment",
    label: "Investment",
    blurb: "Deal flow, evaluación y decisión de inversión.",
    accent: "var(--brand-sea)",
  },
];

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
    group: "Investment",
    status: "live",
    meta: "Datos en vivo",
  },
  {
    slug: "motor-operativo",
    initial: "CP",
    title: "Control Panel",
    description: "KPIs operativos por fondo: DV-I (Menorca) y DV-AM (LATAM).",
    href: "/motor-operativo",
    category: "Dashboard",
    group: "General View",
    status: "live",
    meta: "Snapshot manual",
  },
  {
    slug: "judges-admin-panel",
    initial: "JP",
    title: "Judges Admin Panel",
    description: "Panel de administración de jueces: gestión de evaluadores y evaluaciones.",
    href: "https://judge-panel-production.up.railway.app/admin",
    category: "Herramienta",
    group: "Investment",
    status: "live",
    meta: "App externa",
    external: true,
  },
];

// Número de tiles "próximamente" genéricos para comunicar que el hub va a crecer.
// No participan en la búsqueda ni en los filtros de categoría.
export const COMING_SOON_SLOTS = 1;
