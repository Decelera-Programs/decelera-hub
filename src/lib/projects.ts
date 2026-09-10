/** Tipos compartidos del gestor de proyectos (`hub.projects` y tablas hijas). */
import type { Team } from "@/lib/teams";

export type ProjectHealth = "on_track" | "at_risk" | "blocked" | "done";

export const PROJECT_HEALTHS: ProjectHealth[] = ["on_track", "at_risk", "blocked", "done"];

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  on_track: "En marcha",
  at_risk: "En riesgo",
  blocked: "Bloqueado",
  done: "Terminado",
};

export const HEALTH_COLOR: Record<ProjectHealth, string> = {
  on_track: "var(--status-good)",
  at_risk: "var(--status-warning)",
  blocked: "var(--status-critical)",
  done: "var(--text-muted)",
};

export type ProjectColumn = { id: string; label: string; position: number };

export type ProjectTask = {
  id: string;
  label: string;
  done: boolean;
  position: number;
};

export type ProjectDoc = {
  id: string;
  label: string;
  url: string;
  position: number;
};

export type ProjectOwner = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type Project = {
  id: string;
  title: string;
  info: string;
  columnId: string | null;
  position: number;
  health: ProjectHealth;
  ownerId: string | null;
  owner: ProjectOwner | null;
  team: Team | null;
  startDate: string | null;
  endDate: string | null;
  tasks: ProjectTask[];
  docs: ProjectDoc[];
};

/** Progreso de la checklist como fracción "hechas/total" (0 tareas → null). */
export function taskProgress(tasks: ProjectTask[]): { done: number; total: number } | null {
  if (tasks.length === 0) return null;
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}
