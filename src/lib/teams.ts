/** Equipos de Decelera. Un miembro pertenece a uno o más (tabla `hub.member_teams`). */
export type Team = "inversion" | "marketing" | "tech" | "programa";

export const TEAMS: Team[] = ["inversion", "marketing", "tech", "programa"];

export const TEAM_LABEL: Record<Team, string> = {
  inversion: "Inversión",
  marketing: "Marketing",
  tech: "Tech",
  programa: "Programa",
};

/**
 * Color de identidad por equipo. Tonos saturados y bien diferenciados entre sí para
 * que se distingan de un vistazo en el Kanban (borde lateral, chip relleno).
 */
export const TEAM_ACCENT: Record<Team, string> = {
  inversion: "#1158e5", // azul
  marketing: "#f5701a", // naranja
  tech: "#0eb5c4", // turquesa
  programa: "#9333ea", // violeta
};
