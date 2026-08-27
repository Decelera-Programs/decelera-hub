export type Category = "europe" | "americas" | "operational";

export type DashboardEntry = {
  id: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
  comingSoon?: boolean;
};

export type DashboardGroup = {
  id: string;
  name: string;
  dashboards: DashboardEntry[];
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

const RAILWAY_INTERNAL_NOTE =
  "Está en un dominio privado de Railway (*.railway.internal), que no es accesible desde el navegador. Genera un dominio público en Railway (Settings → Networking → Generate Domain) y actualizamos el enlace.";

/** Flat dashboards shown directly on each category page. */
export const CATEGORY_DASHBOARDS: Record<Category, DashboardEntry[]> = {
  // Europe/Menorca dashboards live under cohort subfolders — see CATEGORY_GROUPS.
  europe: [],
  americas: [
    {
      id: "opencall-mexico",
      name: "Open Call 2026 Dashboard",
      description: "Funnel completo del dealflow de Attio para la opencall México 2026.",
      href: "/opencall-mexico",
      external: false,
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
    {
      id: "portfolio-dashboard",
      name: "Portfolio Dashboard",
      description: RAILWAY_INTERNAL_NOTE,
      href: "#",
      external: true,
      comingSoon: true,
    },
    {
      id: "scoring-algorithm",
      name: "Scoring Algorithm Performance",
      description: RAILWAY_INTERNAL_NOTE,
      href: "#",
      external: true,
      comingSoon: true,
    },
  ],
};

/** Dashboards grouped under a subfolder within a category (e.g. a program cohort). */
export const CATEGORY_GROUPS: Partial<Record<Category, DashboardGroup[]>> = {
  europe: [
    {
      id: "menorca-26",
      name: "Menorca 26",
      dashboards: [
        {
          id: "nps",
          name: "NPS Dashboard",
          description: "Encuestas NPS del programa Menorca 26.",
          href: "https://nps-forms-men26-production-b646.up.railway.app",
          external: true,
        },
        {
          id: "human-dd",
          name: "Human Due Diligence Dashboard",
          description: "Due diligence humana del programa Menorca 26.",
          href: "https://men26olbibrsdashv1-production.up.railway.app",
          external: true,
        },
      ],
    },
  ],
};
