export type Fund = "dv-i" | "dv-am";

export const FUNDS: Fund[] = ["dv-i", "dv-am"];

export const FUND_META: Record<Fund, { label: string }> = {
  "dv-i": { label: "DV-I" },
  "dv-am": { label: "DV-AM" },
};

/** Last time the static snapshot figures below (Main KPIs, Investments, Fundraising) were pulled. */
export const SNAPSHOT_DATE = "28 ago 2026";

export type SquadTile = {
  id: string;
  label: string;
  description: string;
  target?: string;
};

export type StatTileData = {
  id: string;
  label: string;
  description: string;
  value: string;
  target?: string;
  progress?: number;
  thresholdOk?: boolean;
};

/**
 * Main KPIs — a manual snapshot of the Attio deal-flow lists (Startups Deal
 * Flow Menorca / LATAM), taken directly via Attio on {@link SNAPSHOT_DATE}.
 * Not live: the app has no working Attio API key yet, so these numbers
 * won't move until someone updates them here or the Attio connection is
 * restored (see src/lib/attio.ts, currently unused).
 */
export const MAIN_KPIS: Record<Fund, StatTileData[]> = {
  "dv-i": [
    {
      id: "qualified",
      label: "Leads cualificados",
      description: "Compañías con status Qualified en el dealflow Menorca.",
      value: "16",
    },
    {
      id: "pre-committee",
      label: "Oportunidades a pre-comité",
      description: "Compañías con status Pre-committee en el dealflow Menorca.",
      value: "5",
    },
  ],
  "dv-am": [
    {
      id: "qualified",
      label: "Leads cualificados",
      description: "Compañías con status Qualified en el dealflow LATAM.",
      value: "24",
    },
    {
      id: "pre-committee",
      label: "Oportunidades a pre-comité",
      description: "Compañías con status Pre-committee en el dealflow LATAM.",
      value: "7",
    },
    {
      id: "confirmed",
      label: "Mexico '26: compañías confirmadas",
      description: "Compañías con status Invested en el dealflow LATAM.",
      value: "0",
    },
  ],
};

/**
 * Investments squad KPIs, computed from the uploaded MOIC/portfolio Excels
 * (Decelera_MOIC__construccion_portfolio_DV_FCR.xlsx and
 * DeceleraAmericas_MOIC__construccion_portfolio.xlsx), snapshot Q2 2026.
 * "2026" = companies whose first ("Año") investment is 2026, per each
 * workbook's Dashboard sheet — a v1 approximation: follow-on capital
 * deployed in 2026 into pre-2026 companies isn't captured by this rule.
 * Targets (2.4M€ initial, 4M€ follow-on, 12 investments, >5% ownership)
 * are provisional, applied the same to both funds pending real per-fund
 * targets.
 */
export const INVESTMENT_KPIS: Record<Fund, StatTileData[]> = {
  "dv-i": [
    {
      id: "initial-investment",
      label: "€ de inversión inicial en 2026",
      description: "4 inversiones nuevas en 2026: Flipflow, Ruit, HeyDiga, Mathew.ai.",
      value: "1.448.505 €",
      target: "2.400.000 €",
      progress: 1448504.85 / 2400000,
    },
    {
      id: "follow-ons",
      label: "€ de follow-ons en 2026",
      description:
        "Sin follow-ons registrados en compañías invertidas en 2026 a esta fecha (v1 aproximado, ver nota arriba).",
      value: "0 €",
      target: "4.000.000 €",
      progress: 0,
    },
    {
      id: "num-investments",
      label: "Número de inversiones en 2026",
      description: "Compañías con año de inversión inicial 2026.",
      value: "4",
      target: "12",
      progress: 4 / 12,
    },
    {
      id: "avg-ownership",
      label: "Ownership medio (últimas 5 inversiones)",
      description: "Media de Skor, Flipflow, Ruit, HeyDiga, Mathew.ai.",
      value: "4,3%",
      target: "> 5%",
      thresholdOk: false,
    },
  ],
  "dv-am": [
    {
      id: "initial-investment",
      label: "€ de inversión inicial en 2026",
      description: "3 inversiones nuevas en 2026: Cifrato, Neat, Messa.",
      value: "650.000 €",
      target: "2.400.000 €",
      progress: 650000 / 2400000,
    },
    {
      id: "follow-ons",
      label: "€ de follow-ons en 2026",
      description:
        "Sin follow-ons registrados en compañías invertidas en 2026 a esta fecha (v1 aproximado, ver nota arriba).",
      value: "0 €",
      target: "4.000.000 €",
      progress: 0,
    },
    {
      id: "num-investments",
      label: "Número de inversiones en 2026",
      description: "Compañías con año de inversión inicial 2026.",
      value: "3",
      target: "12",
      progress: 3 / 12,
    },
    {
      id: "avg-ownership",
      label: "Ownership medio (últimas 5 inversiones)",
      description: "Media de Neat, Messa, Pitz, Latai Labs, Ximple.",
      value: "2,1%",
      target: "> 5%",
      thresholdOk: false,
    },
  ],
};

/**
 * Fundraising — DV-AM only ("$ committed for DV-AM"). Waiting on the same
 * live Attio connection as Main KPIs — no Excel or manual figure stands in
 * for this one.
 */
export const FUNDRAISING_KPIS: Record<"dv-am", SquadTile[]> = {
  "dv-am": [
    {
      id: "committed",
      label: "$ comprometido",
      description: "Pendiente de la conexión con Attio (lista de fundraising).",
    },
  ],
};

/**
 * Marketing — "Visitas a la web", shared across both funds (one website).
 * Manual snapshot from Squarespace Analytics (Tráfico tab, "Último mes"),
 * pulled by the user on {@link SNAPSHOT_DATE}. Squarespace has no public API
 * for site-traffic analytics (only a commerce-focused one), so this stays a
 * manual figure until the site is wired to Google Analytics (GA4), which
 * does have a queryable API.
 */
export const MARKETING_VISITS_KPI: StatTileData = {
  id: "website-visits",
  label: "Visitas a la web (último mes)",
  description: "Squarespace Analytics · Tráfico · último mes (+53% MoM).",
  value: "3.700",
  target: "100.000",
  progress: 3700 / 100000,
};

/**
 * Remaining squad KPIs — all still pending a data source; see each
 * `description` for what's needed to make it real.
 */
export const SQUAD_KPIS: Record<string, { title: string; tiles: SquadTile[] }> = {
  product: {
    title: "Product",
    tiles: [{ id: "tbc", label: "TBC", description: "Por definir." }],
  },
  marketing: {
    title: "Marketing",
    tiles: [
      {
        id: "followers",
        label: "Seguidores en canales de marca",
        description: "Datos que mantiene Marcos — necesita fuente o carga manual.",
        target: "10.000",
      },
      {
        id: "impressions",
        label: "Impresiones en 2026",
        description: "Necesita acceso a analítica de redes sociales.",
        target: "750.000",
      },
    ],
  },
};
