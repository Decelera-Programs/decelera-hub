// Agregación pura (sin I/O) del dashboard HDD. Testeable con `node --test src/lib/hdd/aggregate.test.mjs`.
// IMPORTANTE: solo `import type` aquí, para que Node lo ejecute con type-stripping sin bundler.
import type {
  FounderHdd, HardKpiKey, HddDashboardData, HddEvent, KpiStat, LegalDilemmaId, LegalMazeDilemma, LegalMazeFlags,
  SoftEvaluation, SoftKpiKey, StartupHdd, TeamKpiKey, WellbeingTake,
} from "./types";

export const SOFT_KEYS: SoftKpiKey[] = [
  "leadership", "integrity", "self_confidence", "cool_head", "unconventional_thinking",
  "doer", "resilience", "ambition_purpose", "openness_coachability",
];
export const TEAM_KEYS: TeamKpiKey[] = [
  "trust_conflict_resolution", "clear_operational_roles", "complementary_personality", "vision_alignment",
];
export const HARD_KEYS: HardKpiKey[] = ["niche_experience", "tech_experience", "go_to_market_experience"];
export const HDD_EVENTS: HddEvent[] = ["Workstations", "Cooking Contest", "Decelera Games"];

/** hard_skills de la app guarda { niche, tech, gtm }; el contrato usa nombres largos. */
const HARD_ALIAS: Record<string, HardKpiKey> = {
  niche: "niche_experience", tech: "tech_experience", gtm: "go_to_market_experience",
  niche_experience: "niche_experience", tech_experience: "tech_experience", go_to_market_experience: "go_to_market_experience",
};

export const NO_STARTUP_ID = "sin-startup";

const round2 = (n: number) => Math.round(n * 100) / 100;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const validScore = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 10;

export function mean(xs: number[]): number | null {
  return xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

/** Filtra un jsonb de scores a las claves permitidas con valor 1-10. */
export function cleanScores<K extends string>(raw: unknown, allowed: readonly K[]): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (!isObj(raw)) return out;
  for (const k of allowed) if (validScore(raw[k])) out[k] = raw[k] as number;
  return out;
}

interface Sample<K extends string> { event?: HddEvent | null; scores: Partial<Record<K, number>> }

/** Media por KPI (y por evento) sobre muestras; cada muestra pesa lo mismo. */
export function aggregateStats<K extends string>(samples: Sample<K>[], keys: readonly K[]): Partial<Record<K, KpiStat>> {
  const out: Partial<Record<K, KpiStat>> = {};
  for (const k of keys) {
    const all: number[] = [];
    const byEv = new Map<HddEvent, number[]>();
    for (const s of samples) {
      const v = s.scores[k];
      if (v === undefined) continue;
      all.push(v);
      if (s.event) byEv.set(s.event, [...(byEv.get(s.event) ?? []), v]);
    }
    if (!all.length) continue;
    const byEvent: KpiStat["byEvent"] = {};
    for (const [ev, vs] of byEv) byEvent[ev] = { avg: mean(vs)!, n: vs.length };
    out[k] = { avg: mean(all)!, n: all.length, byEvent };
  }
  return out;
}

export const aggregateSoft = (evals: SoftEvaluation[]) => aggregateStats(evals, SOFT_KEYS);
export const aggregateTeam = (samples: Sample<TeamKpiKey>[]) => aggregateStats(samples, TEAM_KEYS);

/** Media de las medias de founders por KPI (founders sin dato en ese KPI no cuentan). */
export function softAverage(founders: FounderHdd[]): Partial<Record<SoftKpiKey, number>> {
  const out: Partial<Record<SoftKpiKey, number>> = {};
  for (const k of SOFT_KEYS) {
    const m = mean(founders.map((f) => f.soft[k]?.avg).filter((v): v is number => v !== undefined));
    if (m !== null) out[k] = m;
  }
  return out;
}

/**
 * OneOnOneAudioSubmission.hard_skills = { [founderPersonId]: { niche, tech, gtm } } (1-10).
 * Devuelve por founder la media entre todas las submissions que lo puntúan.
 */
export function aggregateHard(hardSkillsRows: unknown[]): Map<string, Partial<Record<HardKpiKey, number>>> {
  const acc = new Map<string, Partial<Record<HardKpiKey, number[]>>>();
  for (const row of hardSkillsRows) {
    if (!isObj(row)) continue;
    for (const [personId, skills] of Object.entries(row)) {
      if (!isObj(skills)) continue;
      const a = acc.get(personId) ?? {};
      for (const [alias, key] of Object.entries(HARD_ALIAS)) {
        if (validScore(skills[alias])) (a[key] ??= []).push(skills[alias] as number);
      }
      acc.set(personId, a);
    }
  }
  const out = new Map<string, Partial<Record<HardKpiKey, number>>>();
  for (const [id, a] of acc) {
    const o: Partial<Record<HardKpiKey, number>> = {};
    for (const k of HARD_KEYS) { const m = mean(a[k] ?? []); if (m !== null) o[k] = m; }
    if (Object.keys(o).length) out.set(id, o);
  }
  return out;
}

// ---------- Legal Maze ----------
// Definición según el doc "26MEX Legal maze v3 DEF" (el form legal-maze-forms usa los mismos textos y orden).

export const LEGAL_DILEMMAS: Record<LegalDilemmaId, { title: string; kpiLabel: string }> = {
  D1: { title: "Socios", kpiLabel: "Integridad" },
  D2: { title: "Inversionista", kpiLabel: "Ambición" },
  D3: { title: "Cliente", kpiLabel: "Confianza" },
  D4: { title: "Comprador", kpiLabel: "Pensamiento no convencional" },
  D5: { title: "Socios", kpiLabel: "Integridad" },
};
export const LEGAL_IDS = Object.keys(LEGAL_DILEMMAS) as LegalDilemmaId[];

/**
 * Person.legal_maze (form actual): { version: 2, submitted_at, answers: { d1: { choice: 0|1|2, open } } }.
 * Solo se lee `choice` (fuera de 0 a 2 = null); `votes` se ignora. Sin ninguna elección válida = sin responder (null).
 */
export function parseLegalMaze(raw: unknown): { dilemmas: LegalMazeDilemma[]; completedAt: string | null } | null {
  if (!isObj(raw) || !isObj(raw.answers)) return null;
  const answers = raw.answers;
  const dilemmas: LegalMazeDilemma[] = [];
  for (const id of LEGAL_IDS) {
    const a = answers[id.toLowerCase()] ?? answers[id];
    if (!isObj(a)) continue;
    const open = typeof a.open === "string" && a.open.trim() ? a.open.trim() : null;
    const choice = a.choice === 0 || a.choice === 1 || a.choice === 2 ? a.choice : null;
    dilemmas.push({ id, ...LEGAL_DILEMMAS[id], answer: open, choice });
  }
  if (!dilemmas.some((d) => d.choice !== null)) return null;
  return { dilemmas, completedAt: typeof raw.submitted_at === "string" ? raw.submitted_at : null };
}

/** Bandera del Legal Maze: elegir A en el Dilema 1 (la opción 1 que, según el doc, pesa más que cualquier otra casilla). */
export function legalMazeFlags(dilemmas: readonly LegalMazeDilemma[]): LegalMazeFlags {
  return { d1ChoseA: dilemmas.find((d) => d.id === "D1")?.choice === 0 };
}

// ---------- OLBI / BRS ----------
// Forma real (Menorca; Fillout -> Person.olbi_brs / olbi_brs_post), verificada contra los datos:
//   { submitted_at, submission_id, brs: { "<texto pregunta>": "Strongly Agree"... }, olbi: { ... } }
// OLBI (Demerouti): 16 ítems, 8 Exhaustion + 8 Disengagement, 4 opciones (Strongly disagree/Disagree/Agree/Strongly agree
// = 1-4, sin "Neutral"); los 8 ítems redactados en positivo se recodifican (5 - x). Puntuación = media por subescala.
// BRS (Smith et al. 2008): 6 ítems, 5 opciones (1-5), ítems 2, 4 y 6 inversos (6 - x), puntuación = media.
// Los ítems se identifican por texto (normalizado), no por posición.

export const OLBI_MAX = 4;
export const BRS_MAX = 5;
/** Cortes habituales BRS (Smith et al.): < 3,00 baja, 3,00 a 4,30 normal, > 4,30 alta. */
export const BRS_LOW = 3;
export const BRS_HIGH = 4.3;
/** Punto medio de la escala OLBI 1-4 (no hay cortes clínicos universales para OLBI). */
export const OLBI_MID = 2.5;

const LIKERT4: Record<string, number> = {
  "strongly disagree": 1, "totally disagree": 1, disagree: 2, agree: 3, "strongly agree": 4, "totally agree": 4,
  "totalmente en desacuerdo": 1, "en desacuerdo": 2, "de acuerdo": 3, "totalmente de acuerdo": 4,
};
const LIKERT5: Record<string, number> = {
  "strongly disagree": 1, disagree: 2, neutral: 3, agree: 4, "strongly agree": 5,
  "totalmente en desacuerdo": 1, "en desacuerdo": 2, "ni de acuerdo ni en desacuerdo": 3, "de acuerdo": 4, "totalmente de acuerdo": 5,
};
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export const OLBI_ITEMS: Record<string, { scale: "exhaustion" | "disengagement"; rev: boolean }> = {
  // Exhaustion (OLBI 2, 4, 5, 8, 10, 12, 14, 16)
  "there are days when i feel tired before i arrive at work": { scale: "exhaustion", rev: false },
  "after work, i tend to need more time than in the past in order to relax and feel better": { scale: "exhaustion", rev: false },
  "i can tolerate the pressure of my work very well": { scale: "exhaustion", rev: true },
  "during my work, i often feel emotionally drained": { scale: "exhaustion", rev: false },
  "after working, i have enough energy for my leisure activities": { scale: "exhaustion", rev: true },
  "after my work, i usually feel worn out and weary": { scale: "exhaustion", rev: false },
  "usually, i can manage the amount of my work well": { scale: "exhaustion", rev: true },
  "when i work, i usually feel energised": { scale: "exhaustion", rev: true },
  "when i work, i usually feel energized": { scale: "exhaustion", rev: true },
  // Disengagement from Work (OLBI 1, 3, 6, 7, 9, 11, 13, 15)
  "i always find new and interesting aspects in my work": { scale: "disengagement", rev: true },
  "it happens more and more often that i talk about my work in a negative way": { scale: "disengagement", rev: false },
  "lately, i tend to think less at work and do my job almost mechanically": { scale: "disengagement", rev: false },
  "i find my work to be a positive challenge": { scale: "disengagement", rev: true },
  "over time, one can become disconnected from this type of work": { scale: "disengagement", rev: false },
  "sometimes i feel sickened by my work tasks": { scale: "disengagement", rev: false },
  "this is the only type of work that i can imagine myself doing": { scale: "disengagement", rev: true },
  "i feel more and more engaged in my work": { scale: "disengagement", rev: true },
};
export const BRS_ITEMS: Record<string, { rev: boolean }> = {
  "i tend to bounce back quickly after hard times": { rev: false }, // BRS 1
  "i have a hard time making it through stressful events": { rev: true }, // BRS 2
  "it does not take me long to recover from a stressful event": { rev: false }, // BRS 3
  "it is hard for me to snap back when something bad happens": { rev: true }, // BRS 4
  "i usually come through difficult times with little trouble": { rev: false }, // BRS 5
  "i tend to take a long time to get over setbacks in my life": { rev: true }, // BRS 6
};

function likertValue(v: unknown, map: Record<string, number>, max: number): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 1 && v <= max ? v : null;
  if (typeof v === "string") {
    const n = map[norm(v)];
    if (n) return n;
    const num = Number(v);
    return v.trim() !== "" && Number.isFinite(num) && num >= 1 && num <= max ? num : null;
  }
  return null;
}
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Lee una toma OLBI/BRS. Tolera la forma Likert cruda y una ya calculada {exhaustion,disengagement,resilience}. null si no hay nada. */
export function parseWellbeingTake(raw: unknown): WellbeingTake | null {
  if (!isObj(raw)) return null;
  const completedAt = [raw.submitted_at, raw.completed_at, raw.completedAt].find((v) => typeof v === "string") as string | undefined ?? null;

  const buckets: Record<"exhaustion" | "disengagement" | "resilience", number[]> = { exhaustion: [], disengagement: [], resilience: [] };
  if (isObj(raw.olbi)) {
    for (const [q, answer] of Object.entries(raw.olbi)) {
      const def = OLBI_ITEMS[norm(q)];
      const v = def ? likertValue(answer, LIKERT4, OLBI_MAX) : null;
      if (def && v !== null) buckets[def.scale].push(def.rev ? OLBI_MAX + 1 - v : v);
    }
  }
  if (isObj(raw.brs)) {
    for (const [q, answer] of Object.entries(raw.brs)) {
      const def = BRS_ITEMS[norm(q)];
      const v = def ? likertValue(answer, LIKERT5, BRS_MAX) : null;
      if (def && v !== null) buckets.resilience.push(def.rev ? BRS_MAX + 1 - v : v);
    }
  }
  const olbiObj = isObj(raw.olbi) ? raw.olbi : {};
  const brsObj = isObj(raw.brs) ? raw.brs : {};
  const take: WellbeingTake = {
    exhaustion: mean(buckets.exhaustion) ?? numOrNull(raw.exhaustion) ?? numOrNull(olbiObj.exhaustion),
    disengagement: mean(buckets.disengagement) ?? numOrNull(raw.disengagement) ?? numOrNull(olbiObj.disengagement),
    resilience: mean(buckets.resilience) ?? numOrNull(raw.resilience) ?? numOrNull(brsObj.resilience),
    completedAt,
  };
  return take.exhaustion === null && take.disengagement === null && take.resilience === null ? null : take;
}

/** Lectura habitual de BRS: baja < 3,00, normal 3,00 a 4,30, alta > 4,30. */
export function brsBand(v: number | null | undefined): "baja" | "normal" | "alta" | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v < BRS_LOW ? "baja" : v > BRS_HIGH ? "alta" : "normal";
}

/** Un punto del scatter Resiliencia (BRS) vs Disengagement (OLBI). Exhaustion va aparte (tamaño/tooltip). */
export interface ScatterTake { resilience: number; disengagement: number; exhaustion: number | null }
export interface ScatterPoint {
  personId: string; fullName: string; startupId: string; startupName: string;
  pre: ScatterTake | null; post: ScatterTake | null;
}

/** Solo es toma válida para el scatter si tiene BRS y Disengagement (los dos ejes). */
export function scatterTake(t: WellbeingTake | null): ScatterTake | null {
  if (!t || t.resilience == null || t.disengagement == null) return null;
  if (!Number.isFinite(t.resilience) || !Number.isFinite(t.disengagement)) return null;
  return { resilience: t.resilience, disengagement: t.disengagement, exhaustion: t.exhaustion != null && Number.isFinite(t.exhaustion) ? t.exhaustion : null };
}

/** Un punto por founder (los que tienen al menos una toma completa en los dos ejes). */
export function buildScatterPoints(startups: StartupHdd[]): ScatterPoint[] {
  const out: ScatterPoint[] = [];
  for (const s of startups) {
    for (const f of s.founders) {
      const pre = scatterTake(f.wellbeing.pre);
      const post = scatterTake(f.wellbeing.post);
      if (pre || post) out.push({ personId: f.personId, fullName: f.fullName, startupId: s.startupId, startupName: s.name, pre, post });
    }
  }
  return out;
}

export type ScatterMode = "pre" | "post" | "delta";
export interface ScatterSeriesPoint extends ScatterTake { kind: "pre" | "post" }
export interface ScatterSeries { point: ScatterPoint; pts: ScatterSeriesPoint[] }

/**
 * Filas a dibujar según el modo: "pre" o "post" = una toma por founder (si la tiene); "delta" = solo founders con
 * las dos tomas (pre y post), para unirlas con una línea. Orden estable: el de entrada.
 */
export function scatterSeries(points: ScatterPoint[], mode: ScatterMode): ScatterSeries[] {
  const out: ScatterSeries[] = [];
  for (const point of points) {
    const { pre, post } = point;
    if (mode === "pre" && pre) out.push({ point, pts: [{ kind: "pre", ...pre }] });
    else if (mode === "post" && post) out.push({ point, pts: [{ kind: "post", ...post }] });
    else if (mode === "delta" && pre && post) out.push({ point, pts: [{ kind: "pre", ...pre }, { kind: "post", ...post }] });
  }
  return out;
}

/** Cuadrante del scatter: corte de resiliencia en BRS 3,0 y de Disengagement en el punto medio 2,5. */
export function scatterQuadrant(t: { resilience: number; disengagement: number }):
  "resiliente_comprometido" | "poco_resiliente_comprometido" | "resiliente_desconectado" | "poco_resiliente_desconectado" {
  const res = t.resilience >= BRS_LOW;
  const eng = t.disengagement < OLBI_MID;
  return res ? (eng ? "resiliente_comprometido" : "resiliente_desconectado") : eng ? "poco_resiliente_comprometido" : "poco_resiliente_desconectado";
}

// ---------- Ensamblado ----------

export interface RawStartup { id: string; name: string; logo_url: string | null; sector: string | null }
export interface RawFounder {
  id: string; full_name: string | null; photo_url: string | null; startup_id: string | null;
  legal_maze: unknown; olbi_brs: unknown; olbi_brs_post: unknown;
}
export interface RawHumanDD {
  evaluator_id: string | null; event: string; founder_id: string | null; startup_id: string | null;
  scores: unknown; submission_date: string | null;
}
export interface RawSubmission { startup_id: string | null; team_kpis: unknown; hard_skills: unknown }
export interface HddRawInput {
  startups: RawStartup[];
  founders: RawFounder[];
  teamNames: Record<string, string>; // Person.id (team/EM) -> full_name
  humanDD: RawHumanDD[];
  submissions: RawSubmission[]; // OneOnOneAudioSubmission con startup_id ya resuelto vía OneOnOne
  now?: Date;
}

const isHddEvent = (e: string): e is HddEvent => (HDD_EVENTS as string[]).includes(e);

export function buildHddDashboard(input: HddRawInput): HddDashboardData {
  const { teamNames } = input;

  const evalsByFounder = new Map<string, SoftEvaluation[]>();
  const teamSamplesByStartup = new Map<string, Sample<TeamKpiKey>[]>();
  const pushTeam = (sid: string, s: Sample<TeamKpiKey>) => teamSamplesByStartup.set(sid, [...(teamSamplesByStartup.get(sid) ?? []), s]);

  for (const r of input.humanDD) {
    if (!isHddEvent(r.event)) continue;
    if (r.founder_id) {
      const scores = cleanScores(r.scores, SOFT_KEYS);
      if (!Object.keys(scores).length) continue;
      const list = evalsByFounder.get(r.founder_id) ?? [];
      list.push({
        event: r.event, evaluatorId: r.evaluator_id ?? "", evaluatorName: r.evaluator_id ? teamNames[r.evaluator_id] ?? null : null,
        submissionDate: r.submission_date, scores,
      });
      evalsByFounder.set(r.founder_id, list);
    } else if (r.startup_id) {
      // Decelera Games a nivel equipo: founder_id NULL + 4 claves de TeamKpiKey
      const scores = cleanScores(r.scores, TEAM_KEYS);
      if (Object.keys(scores).length) pushTeam(r.startup_id, { event: r.event, scores });
    }
  }

  const hardRows: unknown[] = [];
  for (const s of input.submissions) {
    if (s.hard_skills) hardRows.push(s.hard_skills);
    const scores = cleanScores(s.team_kpis, TEAM_KEYS);
    if (s.startup_id && Object.keys(scores).length) pushTeam(s.startup_id, { event: null, scores });
  }
  const hardByFounder = aggregateHard(hardRows);

  const buildFounder = (f: RawFounder): FounderHdd => {
    const evaluations = (evalsByFounder.get(f.id) ?? []).sort((a, b) => (a.submissionDate ?? "").localeCompare(b.submissionDate ?? ""));
    return {
      personId: f.id,
      fullName: f.full_name ?? "Sin nombre",
      photoUrl: f.photo_url,
      startupId: f.startup_id,
      soft: aggregateSoft(evaluations),
      evaluations,
      hard: hardByFounder.get(f.id) ?? {},
      legalMaze: parseLegalMaze(f.legal_maze),
      wellbeing: { pre: parseWellbeingTake(f.olbi_brs), post: parseWellbeingTake(f.olbi_brs_post) },
    };
  };

  const foundersByStartup = new Map<string, FounderHdd[]>();
  for (const f of input.founders) {
    const sid = f.startup_id ?? NO_STARTUP_ID;
    foundersByStartup.set(sid, [...(foundersByStartup.get(sid) ?? []), buildFounder(f)]);
  }

  const meta = new Map(input.startups.map((s) => [s.id, s]));
  const ids = new Set<string>([...foundersByStartup.keys(), ...teamSamplesByStartup.keys()].filter((id) => id === NO_STARTUP_ID || meta.has(id)));

  const startups: StartupHdd[] = [...ids].map((sid) => {
    const founders = (foundersByStartup.get(sid) ?? []).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const m = meta.get(sid);
    return {
      startupId: sid,
      name: m?.name ?? "Sin startup",
      logoUrl: m?.logo_url ?? null,
      sector: m?.sector ?? null,
      founders,
      team: aggregateTeam(teamSamplesByStartup.get(sid) ?? []),
      softAvg: softAverage(founders),
      coverage: {
        founders: founders.length,
        withSoft: founders.filter((f) => Object.keys(f.soft).length > 0).length,
        withLegalMaze: founders.filter((f) => f.legalMaze).length,
        withWellbeingPre: founders.filter((f) => f.wellbeing.pre).length,
        withWellbeingPost: founders.filter((f) => f.wellbeing.post).length,
      },
    };
  });
  // "Sin startup" siempre al final
  startups.sort((a, b) => (a.startupId === NO_STARTUP_ID ? 1 : b.startupId === NO_STARTUP_ID ? -1 : a.name.localeCompare(b.name)));

  return { generatedAt: (input.now ?? new Date()).toISOString(), startups };
}
