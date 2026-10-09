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
 * Legal Maze (Person.legal_maze). Dos versiones del formulario:
 * - version 1: answers:{ d1..d5:{ votes:[b,b,b], open } }. El founder vota cada opción Verde (true = "yo lo haría") o
 *   Roja (false). Lo que importa es el PATRÓN de los 3 votos en orden (ver classifyLegalPattern).
 * - version 2: answers:{ d1..d5:{ choice:0|1|2, votes:[...], open } }. El founder ELIGE una opción (A, B o C = 0, 1, 2).
 *   `votes` solo es true en la elegida, por compatibilidad: NO son votos libres y de ellos NUNCA se deriva un patrón.
 *   Los patrones del doc (RRV...) solo valen para la versión 1.
 * Fuente: doc "26MEX Legal maze v3 DEF" y form legal-maze-forms.
 * NO hay puntuación numérica.
 * Las lecturas Positivo/Negativo de cada opción son explicación del facilitador, no puntuación, y no se guardan.
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
  /** Solo versión 1: [opción1, opción2, opción3]; true = Verde, false = Rojo. Ausente en versión 2. */
  votes?: boolean[];
  /** Solo versión 2: opción elegida (0 = A, 1 = B, 2 = C); null si no hay elección válida. Ausente en versión 1. */
  choice?: 0 | 1 | 2 | null;
}

export type LegalPatternLevel = "esperado" | "comun" | "atencion" | "senal_fuerte" | "raro";

export interface LegalPattern {
  /** Los 3 votos en orden: "RRV", "VRR"... */
  key: string;
  level: LegalPatternLevel;
  levelLabel: string;
  /** Lectura del doc en español. */
  reading: string;
  /** Rojo triple sin nada escrito: cuenta como indecisión, no como "rechaza las cuatro". */
  undecided: boolean;
}

export interface LegalMazeFlags {
  /** Versión 1: verde a la opción 1 del Dilema 1: pesa más que cualquier otra casilla de la hoja (doc). */
  d1GreenOption1: boolean;
  /** Versión 2: eligió la opción A del Dilema 1 (la opción 1 del doc, la que "pesa más que cualquier otra casilla"). */
  d1ChoseA: boolean;
  /** Dilemas con rojo triple y campo abierto vacío (indecisión). */
  undecided: LegalDilemmaId[];
  /** Los 5 dilemas en R R V y ninguno con campo abierto: sólido y convencional (señal media para tesis de riesgo). */
  solidConventional: boolean;
  /** Dilemas con patrón VRR (señal fuerte), VVV o VVR para revisar en Fase 3 / Court. */
  toReview: LegalDilemmaId[];
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
  legalMaze: { version: 1 | 2; dilemmas: LegalMazeDilemma[]; completedAt: string | null } | null;
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
