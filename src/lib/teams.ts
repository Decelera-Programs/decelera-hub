/** Equipos de Decelera. Un miembro pertenece a uno o más (tabla `hub.member_teams`). */
export type Team = "inversion" | "marketing" | "tech" | "programa";

export const TEAMS: Team[] = ["inversion", "marketing", "tech", "programa"];

export const TEAM_LABEL: Record<Team, string> = {
  inversion: "Inversión",
  marketing: "Marketing",
  tech: "Tech",
  programa: "Programa",
};

/** Color de acento por equipo (para chips y, más adelante, tarjetas de proyecto). */
export const TEAM_ACCENT: Record<Team, string> = {
  inversion: "var(--brand-sea)",
  marketing: "var(--brand-sun)",
  tech: "var(--brand-water)",
  programa: "var(--series-2)",
};
