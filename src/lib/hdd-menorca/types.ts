// Contrato de datos del dashboard Human Due Diligence Menorca 2026. Lo produce src/lib/hdd-menorca/data.ts
// (servidor, lee historico.program_dd) y lo consume la UI (src/components/hdd-menorca/*).
// El bienestar (OLBI/BRS) reutiliza el contrato de México (WellbeingTake) y sus componentes.
import type { WellbeingTake } from "@/lib/hdd/types";

/** Escala de TODAS las puntuaciones de soft/hard skills y de las métricas del Legal Maze de Menorca: 1 a 4. */
export const MENORCA_SCALE_MAX = 4;

export type MenorcaSoftKey =
  | "leadership" | "cool_head" | "resilience" | "coachability"
  | "integrity" | "self_confidence" | "unconventional_thinking" | "doer" | "purpose" | "ambition_obsession";
export type MenorcaTeamKey =
  | "trust_conflict_resolution" | "clear_operational_roles" | "complementary_personality" | "vision_alignment";

/** De dónde sale una puntuación: Paellas Contest, Decelera Games (varias personas del equipo) o ficha HDD (evaluador). */
export type MenorcaSource = "paellas" | "games" | "ficha";

export interface MenorcaSample { source: MenorcaSource; evaluator: string | null; value: number }

export interface MenorcaStat {
  avg: number;
  n: number;
  bySource: Partial<Record<MenorcaSource, { avg: number; n: number }>>;
}

export interface MenorcaLegalMaze {
  /** Respuesta (A), B), C), D)) de cada pregunta, en el orden del form. `label` sale de la clave (q1_cofundador). */
  answers: { key: string; label: string; choice: string | null }[];
  /** Métricas calculadas por el form (1 a 4). */
  metrics: { key: string; value: number }[];
  completedAt: string | null;
}

export interface MenorcaChallengeItem { section: string; item: string; rating: number; text: string }
export interface MenorcaChallenge {
  founderName: string;
  items: MenorcaChallengeItem[];
  /** Texto libre de cada sección ("clarification"), por sección. */
  clarifications: { section: string; text: string }[];
  name: string | null;
  decision: string | null;
  hypothesis: string | null;
  helpNeeded: string | null;
  expertiseWanted: string | null;
  completedAt: string | null;
}

export interface MenorcaFounder {
  personId: string;
  fullName: string;
  startupId: string;
  soft: Partial<Record<MenorcaSoftKey, MenorcaStat>>;
  /** Experiencia en el nicho (ficha HDD), 1 a 4. */
  niche: MenorcaStat | null;
  evaluators: string[];
  samples: number;
  legalMaze: MenorcaLegalMaze | null;
  wellbeing: { pre: WellbeingTake | null; post: WellbeingTake | null };
  challenge: MenorcaChallenge | null;
}

export interface MenorcaStartup {
  startupId: string;
  name: string;
  founders: MenorcaFounder[];
  /** KPIs de equipo (ficha HDD de los founders de la startup). Vacío si nadie los ha puntuado. */
  team: Partial<Record<MenorcaTeamKey, MenorcaStat>>;
  softAvg: Partial<Record<MenorcaSoftKey, number>>;
  /** Media de las métricas del Legal Maze de sus founders. */
  legalAvg: { key: string; value: number }[];
  wellbeing: { pre: WellbeingTake | null; post: WellbeingTake | null; nPre: number; nPost: number };
  coverage: { founders: number; withSoft: number; withLegalMaze: number; withWellbeingPre: number; withWellbeingPost: number; withChallenge: number };
}

export interface MenorcaDashboardData { generatedAt: string; startups: MenorcaStartup[] }
