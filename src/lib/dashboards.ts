export type Category = "europe" | "americas" | "operational";

export type DashboardEntry = {
  id: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
  comingSoon?: boolean;
};

export const CATEGORIES: Category[] = ["europe", "americas", "operational"];

export const CATEGORY_META: Record<
  Category,
  { title: string; subtitle: string; description: string }
> = {
  europe: {
    title: "Decelera Europe",
    subtitle: "Menorca",
    description: "Dashboards del programa de Decelera en Menorca.",
  },
  americas: {
    title: "Decelera Americas",
    subtitle: "LATAM",
    description: "Dashboards del programa de Decelera en LATAM.",
  },
  operational: {
    title: "Operational",
    subtitle: "Interno",
    description: "Dashboards internos de seguimiento de dealflow y operaciones.",
  },
};

/**
 * Placeholder entries for Europe/Americas — these dashboards live in other repos/apps.
 * Swap `href` for the real URL and drop `comingSoon` once each one is ready.
 */
export const CATEGORY_DASHBOARDS: Record<Category, DashboardEntry[]> = {
  europe: [
    {
      id: "europe-placeholder-1",
      name: "Dashboard Menorca (pendiente)",
      description: "Añade aquí el nombre y la URL del dashboard.",
      href: "#",
      external: true,
      comingSoon: true,
    },
    {
      id: "europe-placeholder-2",
      name: "Dashboard Menorca (pendiente)",
      description: "Añade aquí el nombre y la URL del dashboard.",
      href: "#",
      external: true,
      comingSoon: true,
    },
  ],
  americas: [
    {
      id: "americas-placeholder-1",
      name: "Dashboard LATAM (pendiente)",
      description: "Añade aquí el nombre y la URL del dashboard.",
      href: "#",
      external: true,
      comingSoon: true,
    },
    {
      id: "americas-placeholder-2",
      name: "Dashboard LATAM (pendiente)",
      description: "Añade aquí el nombre y la URL del dashboard.",
      href: "#",
      external: true,
      comingSoon: true,
    },
  ],
  operational: [
    {
      id: "opencall-mexico",
      name: "Opencall México 2026",
      description: "Funnel completo del dealflow de Attio para la opencall México 2026.",
      href: "/opencall-mexico",
      external: false,
    },
    {
      id: "maru",
      name: "Canal Maru",
      description: "Desglose del canal de outreach Maru dentro del mismo dealflow.",
      href: "/maru",
      external: false,
    },
  ],
};
