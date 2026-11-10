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

export type ProjectPriority = "high" | "medium" | "low";

export const PROJECT_PRIORITIES: ProjectPriority[] = ["high", "medium", "low"];

export const PRIORITY_LABEL: Record<ProjectPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const PRIORITY_COLOR: Record<ProjectPriority, string> = {
  high: "var(--status-critical)",
  medium: "var(--status-warning)",
  low: "var(--text-muted)",
};

export type ProjectColumn = { id: string; label: string; position: number };

/** Prioridad estratégica anual (`hub.strategic_priorities`). Inactiva = "Future Horizon". */
export type StrategicPriority = {
  id: string;
  year: number;
  position: number;
  title: string;
  shortName: string;
  context: string;
  whyItMatters: string;
  successMetrics: string;
  relatedProblemSpace: string;
  isActive: boolean;
};

/** Un proyecto puede colgar como máximo de 2 prioridades (regla de UI, no de BD). */
export const MAX_PROJECT_PRIORITIES = 2;

/** Color por posición de la prioridad; distinto de los colores de equipo. */
const STRATEGIC_ACCENTS = ["#e11d48", "#059669", "#ca8a04", "#64748b"];
export function strategicAccent(position: number): string {
  return STRATEGIC_ACCENTS[position % STRATEGIC_ACCENTS.length];
}

const PRIORITY_RANK: Record<ProjectPriority, number> = { high: 0, medium: 1, low: 2 };
/** Comparador: prioridad del proyecto (alta → baja) y luego posición. */
export function byProjectPriority(a: Project, b: Project): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.position - b.position;
}

export type ProjectTask = {
  id: string;
  label: string;
  done: boolean;
  position: number;
  ownerId: string | null;
  owner: ProjectOwner | null;
  dueDate: string | null;
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
  successCriteria: string;
  columnId: string | null;
  position: number;
  health: ProjectHealth;
  priority: ProjectPriority;
  ownerId: string | null;
  owner: ProjectOwner | null;
  team: Team | null;
  startDate: string | null;
  endDate: string | null;
  /** Ids de `strategic_priorities` a las que contribuye (máx. 2). */
  priorityIds: string[];
  tasks: ProjectTask[];
  docs: ProjectDoc[];
};

/** Progreso de la checklist como fracción "hechas/total" (0 tareas → null). */
export function taskProgress(tasks: ProjectTask[]): { done: number; total: number } | null {
  if (tasks.length === 0) return null;
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}
