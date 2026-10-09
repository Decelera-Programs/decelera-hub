// Contrato de datos del dashboard Human Due Diligence (HDD). Lo produce src/lib/hdd/data.ts (servidor)
// y lo consume la UI (src/components/hdd/*). Escalas: KPIs 1-10; Legal Maze y OLBI/BRS según su fuente
// (documentadas en cada tipo).

export type SoftKpiKey =
  | "leadership" | "integrity" | "self_confidence" | "cool_head" | "unconventional_thinking"
  | "doer" | "resilience" | "ambition_purpose" | "openness_coachability";

export type HardKpiKey = "niche_experience" | "tech_experience" | "go_to_market_experience";

export type TeamKpiKey =
  | "trust_conflict_resolution" | "clear_operational_roles" | "complementary_personality" | "vision_alignment";

export type HddEvent = "Workstations" | "Cooking Contest" | "Decelera Games";

/** Una evaluación individual de un evaluador (team) a un founder en una dinámica. */
export interface SoftEvaluation {
  event: HddEvent;
  evaluatorId: string;
  evaluatorName: string | null;
  submissionDate: string | null; // YYYY-MM-DD
  scores: Partial<Record<SoftKpiKey, number>>;
}

/** Media de un KPI entre evaluaciones (n = nº de evaluaciones que lo puntúan). */
export interface KpiStat { avg: number; n: number; byEvent: Partial<Record<HddEvent, { avg: number; n: number }>> }

/**
 * Legal Maze (Person.legal_maze = { version:2, submitted_at, answers:{ d1..d5:{ choice:0|1|2, votes, open } } }).
 * Fuente: doc "26MEX Legal maze v3 DEF" y form legal-maze-forms (versión actual). Cada dilema es ELEGIR una opción
 * (A, B o C = choice 0, 1, 2) más un campo abierto opcional. Solo se lee `choice`; `votes` (true solo en la elegida,
 * por compatibilidad) se ignora. Datos sin `choice` válido cuentan como "sin responder".
 * NO hay puntuación numérica: las lecturas Positivo/Negativo de cada opción (legalMazeContent.ts) son explicación
 * del facilitador, no puntuación.
 * `kpiLabel` es libre a propósito: D3 mide "Confianza", que NO es una de las 9 soft skills (SoftKpiKey).
 */
export type LegalDilemmaId = "D1" | "D2" | "D3" | "D4" | "D5";

export interface LegalMazeDilemma {
  id: LegalDilemmaId;
  /** Tema del dilema (Socios, Inversionista, Cliente, Comprador, Socios). */
  title: string;
  /** KPI que mide según el doc (Integridad, Ambición, Confianza, Pensamiento no convencional, Integridad). */
  kpiLabel: string;
  /** Texto libre del campo abierto (null si vacío). */
  answer: string | null;
  /** Opción elegida (0 = A, 1 = B, 2 = C); null si no hay elección válida. */
  choice: 0 | 1 | 2 | null;
}

export interface LegalMazeFlags {
  /** Eligió la opción A del Dilema 1. El doc dice que la opción 1 del D1 "pesa más que cualquier otra casilla de la hoja". */
  d1ChoseA: boolean;
}

/**
 * OLBI (Oldenburg Burnout Inventory, Demerouti) y BRS (Brief Resilience Scale, Smith et al. 2008), pre y post.
 * null = sin respuesta. Siempre por separado: NUNCA hay un OLBI total, solo Exhaustion y Disengagement.
 *
 * ESCALAS Y DIRECCIÓN (ítems inversos ya recodificados, puntuación = MEDIA de los ítems respondidos):
 * - exhaustion (OLBI, 8 ítems): escala 1-4 (1 = Strongly disagree ... 4 = Strongly agree; el form usa 4 opciones,
 *   sin "Neutral", como el original). MÁS ALTO = PEOR (más agotamiento). Punto medio de la escala = 2,5.
 * - disengagement (OLBI "Disengagement from Work", 8 ítems): escala 1-4. MÁS ALTO = PEOR (más desconexión). Medio = 2,5.
 * - resilience (BRS, 6 ítems): escala 1-5 (Strongly disagree ... Strongly agree). MÁS ALTO = MEJOR.
 *   Lectura habitual: < 3,00 baja, 3,00 a 4,30 normal, > 4,30 alta.
 * Los tres rangos NO son comparables entre sí (OLBI 1-4, BRS 1-5).
 */
export interface WellbeingTake { exhaustion: number | null; disengagement: number | null; resilience: number | null; completedAt: string | null }

export interface FounderHdd {
  personId: string;
  fullName: string;
  photoUrl: string | null;
  startupId: string | null;
  soft: Partial<Record<SoftKpiKey, KpiStat>>;
  evaluations: SoftEvaluation[];
  hard: Partial<Record<HardKpiKey, number>>; // de OneOnOneAudioSubmission.hard_skills (por EM, media si varios)
  legalMaze: { dilemmas: LegalMazeDilemma[]; completedAt: string | null } | null;
  wellbeing: { pre: WellbeingTake | null; post: WellbeingTake | null };
}

export interface StartupHdd {
  startupId: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  founders: FounderHdd[];
  team: Partial<Record<TeamKpiKey, KpiStat>>; // de OneOnOneAudioSubmission.team_kpis + Decelera Games (HumanDD sin founder)
  softAvg: Partial<Record<SoftKpiKey, number>>; // media de los founders
  coverage: { founders: number; withSoft: number; withLegalMaze: number; withWellbeingPre: number; withWellbeingPost: number };
}

export interface HddDashboardData {
  generatedAt: string;
  startups: StartupHdd[];
}
