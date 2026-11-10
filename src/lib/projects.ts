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

/** Un proyecto puede colgar como máximo de 3 prioridades (regla de UI, no de BD). */
export const MAX_PROJECT_PRIORITIES = 3;

/** Color por posición de la prioridad: solo paleta de marca (Sea, Sun, Water, Cloud). */
const STRATEGIC_ACCENTS = ["var(--brand-sea)", "var(--brand-sun)", "var(--brand-water)", "var(--brand-cloud)"];
export function strategicAccent(position: number): string {
  return STRATEGIC_ACCENTS[position % STRATEGIC_ACCENTS.length];
}
/** Versión para texto: Sun, Water y Cloud se mezclan con el color de texto para que se lean. */
export function strategicInk(position: number): string {
  const i = position % STRATEGIC_ACCENTS.length;
  return i === 0 ? STRATEGIC_ACCENTS[0] : `color-mix(in srgb, ${STRATEGIC_ACCENTS[i]} 55%, var(--text-primary))`;
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
