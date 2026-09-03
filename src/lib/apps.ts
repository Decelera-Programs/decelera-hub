export type AppStatus = "live" | "beta" | "soon";
export type AppCategory = "Dashboard" | "Herramienta" | "Datos";
export type AppGroup = "General View" | "Investment" | "Tech / Data" | "Marketing";

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
  {
    id: "Tech / Data",
    label: "Tech / Data",
    blurb: "Producto, repositorios y recursos técnicos.",
    accent: "var(--brand-night)",
  },
  {
    id: "Marketing",
    label: "Marketing",
    blurb: "Marca, contenidos y materiales del equipo.",
    accent: "var(--brand-sun)",
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
    slug: "hoja-ruta-mex26",
    initial: "HR",
    title: "Hoja de Ruta Mex26",
    description: "Hoja de cálculo con la planificación y los hitos del programa de México 2026.",
    href: "https://docs.google.com/spreadsheets/d/13nTLn6JHq0K5Twy_kydqFked1bS3fqy0vqohEG8zkGo/edit?gid=1130289983#gid=1130289983",
    category: "Herramienta",
    group: "General View",
    status: "live",
    meta: "Google Sheets",
    external: true,
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
  {
    slug: "tech-product-drive",
    initial: "TP",
    title: "Tech Product Drive Folder",
    description: "Carpeta de Drive con la documentación y los recursos de producto tech.",
    href: "https://drive.google.com/drive/u/0/folders/1Epi9bViOYIYbWkAeQgqO4yz0YLSEbO6S?ths=true",
    category: "Herramienta",
    group: "Tech / Data",
    status: "live",
    meta: "Drive",
    external: true,
  },
  {
    slug: "decelera-github",
    initial: "GH",
    title: "Decelera's Github",
    description: "Organización de GitHub con los repositorios del equipo.",
    href: "https://github.com/Decelera-Programs",
    category: "Herramienta",
    group: "Tech / Data",
    status: "live",
    meta: "GitHub",
    external: true,
  },
  {
    slug: "brand-assets",
    initial: "BR",
    title: "Logos y marca",
    description: "Carpeta de Drive con los logos y el brand de Decelera.",
    href: "https://drive.google.com/drive/u/0/folders/1faoyvaZTUBEMwn7Xwq3Upl5Eo1NiEHII?ths=true",
    category: "Herramienta",
    group: "Marketing",
    status: "live",
    meta: "Drive",
    external: true,
  },
];

// Número de tiles "próximamente" genéricos para comunicar que el hub va a crecer.
// No participan en la búsqueda ni en los filtros de categoría.
export const COMING_SOON_SLOTS = 1;
