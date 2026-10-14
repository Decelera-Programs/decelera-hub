// Agregación pura (sin I/O) del dashboard HDD Menorca 2026. Lee las filas de historico.program_dd
// (event_name = 'Menorca 2026'): una fila por founder con
//   metadata.paellas / metadata.decelera_games = { <skill>: [n evaluadores], evaluator: [nombres] }
//   metadata.human_dd_compact = { scores: {...}, evaluator } (o un array de ellas)
//   metadata.legal_maze = { answers: { q1_cofundador: "A)" ... }, metrics: {...}, submitted_at }
//   metadata.challenges = { founder, sections: { <sección>: { ratings, clarification } }, deep_dive, submitted_at }
//   human_dd.pt1.pre / .post = { BRS_Q1..6, OLBI_Q1..16 } (texto Likert)
import { parseWellbeingTake } from "@/lib/hdd/aggregate";
import type { WellbeingTake } from "@/lib/hdd/types";
import {
  MENORCA_SCALE_MAX,
  type MenorcaChallenge, type MenorcaDashboardData, type MenorcaFounder, type MenorcaLegalMaze, type MenorcaSample,
  type MenorcaSoftKey, type MenorcaSource, type MenorcaStartup, type MenorcaStat, type MenorcaTeamKey,
} from "./types";

export const SOFT_KEYS: MenorcaSoftKey[] = [
  "leadership", "cool_head", "resilience", "coachability",
  "integrity", "self_confidence", "unconventional_thinking", "doer", "purpose", "ambition_obsession",
];
export const TEAM_KEYS: MenorcaTeamKey[] = [
  "trust_conflict_resolution", "clear_operational_roles", "complementary_personality", "vision_alignment",
];
export const NO_STARTUP_ID = "sin-startup";

export interface RawProgramDd {
  id: number;
  person_name: string | null;
  company_name: string | null;
  company_id: string | null;
  person_id: string | null;
  metadata: unknown;
  human_dd: unknown;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const validScore = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= MENORCA_SCALE_MAX;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function mean(xs: number[]): number | null {
  return xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

/** Media y desglose por fuente de una lista de muestras. null si no hay ninguna. */
export function statOf(samples: MenorcaSample[]): MenorcaStat | null {
  if (!samples.length) return null;
  const bySource: MenorcaStat["bySource"] = {};
  for (const src of ["paellas", "games", "ficha"] as MenorcaSource[]) {
    const vs = samples.filter((s) => s.source === src).map((s) => s.value);
    if (vs.length) bySource[src] = { avg: mean(vs)!, n: vs.length };
  }
  return { avg: mean(samples.map((s) => s.value))!, n: samples.length, bySource };
}

/** Paellas / Games: { skill: [valores], evaluator: [nombres] } (el valor puede venir suelto en vez de lista). */
export function parseListSource(raw: unknown, source: "paellas" | "games"): Partial<Record<MenorcaSoftKey, MenorcaSample[]>> {
  const out: Partial<Record<MenorcaSoftKey, MenorcaSample[]>> = {};
  if (!isObj(raw)) return out;
  const evaluators = Array.isArray(raw.evaluator) ? raw.evaluator : raw.evaluator != null ? [raw.evaluator] : [];
  for (const k of SOFT_KEYS) {
    const v = raw[k];
    const vals = Array.isArray(v) ? v : v != null ? [v] : [];
    const samples = vals.flatMap((x, i) => (validScore(x) ? [{ source, evaluator: str(evaluators[i]), value: x }] : []));
    if (samples.length) out[k] = samples;
  }
  return out;
}

/** Ficha HDD compacta: un objeto o una lista de objetos { scores, evaluator }. */
export function parseCompact(raw: unknown): { soft: Partial<Record<MenorcaSoftKey, MenorcaSample[]>>; niche: MenorcaSample[]; team: Partial<Record<MenorcaTeamKey, MenorcaSample[]>> } {
  const soft: Partial<Record<MenorcaSoftKey, MenorcaSample[]>> = {};
  const team: Partial<Record<MenorcaTeamKey, MenorcaSample[]>> = {};
  const niche: MenorcaSample[] = [];
  const items = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  for (const it of items) {
    if (!isObj(it) || !isObj(it.scores)) continue;
    const evaluator = str(it.evaluator);
    const add = (v: unknown): MenorcaSample[] => (validScore(v) ? [{ source: "ficha", evaluator, value: v }] : []);
    for (const k of SOFT_KEYS) { const s = add(it.scores[k]); if (s.length) soft[k] = [...(soft[k] ?? []), ...s]; }
    for (const k of TEAM_KEYS) { const s = add(it.scores[k]); if (s.length) team[k] = [...(team[k] ?? []), ...s]; }
    niche.push(...add(it.scores.niche_experience));
  }
  return { soft, niche, team };
}

/** Etiquetas con tilde de las preguntas conocidas del Legal Maze de Menorca; el resto se deriva de la clave. */
const LEGAL_LABELS: Record<string, string> = {
  q1_cofundador: "Cofundador", q2_salvavidas: "Salvavidas", q3_metrica_fantasma: "Métrica fantasma",
  q4_chantaje_talento: "Chantaje de talento", q5_atajo_comodo: "Atajo cómodo", q6_bifurcacion: "Bifurcación",
};
const humanize = (key: string) => {
  if (LEGAL_LABELS[key]) return LEGAL_LABELS[key];
  const t = key.replace(/^q\d+_/, "").replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function parseLegalMaze(raw: unknown): MenorcaLegalMaze | null {
  if (!isObj(raw)) return null;
  const answers = isObj(raw.answers)
    ? Object.entries(raw.answers)
        .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
        .map(([key, v]) => ({ key, label: humanize(key), choice: str(v) }))
    : [];
  const metrics = isObj(raw.metrics)
    ? Object.entries(raw.metrics).flatMap(([key, v]) => (validScore(v) ? [{ key, value: v }] : []))
    : [];
  if (!answers.some((a) => a.choice) && !metrics.length) return null;
  return { answers, metrics, completedAt: str(raw.submitted_at) };
}

// ---------- OLBI / BRS ----------
// historico guarda las respuestas por número de ítem (BRS_Q1..6, OLBI_Q1..16). Orden verificado contra los textos de
// la app (Person.olbi_brs de la copia de Menorca 2026, coincidencia 16/16 en las 22 preguntas). Se traduce al texto
// de cada ítem para reutilizar parseWellbeingTake (México), que puntúa e invierte los ítems por texto.
const BRS_ORDER = [
  "I tend to bounce back quickly after hard times",
  "I have a hard time making it through stressful events",
  "It does not take me long to recover from a stressful event",
  "It is hard for me to snap back when something bad happens",
  "I usually come through difficult times with little trouble",
  "I tend to take a long time to get over setbacks in my life",
];
const OLBI_ORDER = [
  "I always find new and interesting aspects in my work",
  "There are days when I feel tired before I arrive at work",
  "It happens more and more often that I talk about my work in a negative way",
  "After work, I tend to need more time than in the past in order to relax and feel better",
  "I can tolerate the pressure of my work very well",
  "Lately, I tend to think less at work and do my job almost mechanically",
  "I find my work to be a positive challenge",
  "During my work, I often feel emotionally drained",
  "Over time, one can become disconnected from this type of work",
  "After working, I have enough energy for my leisure activities",
  "Sometimes I feel sickened by my work tasks",
  "After my work, I usually feel worn out and weary",
  "This is the only type of work that I can imagine myself doing",
  "Usually, I can manage the amount of my work well",
  "I feel more and more engaged in my work",
  "When I work, I usually feel energised",
];

/** { BRS_Q1.., OLBI_Q1.. } -> toma de bienestar. null si no hay respuestas. */
export function parseNumberedWellbeing(raw: unknown): WellbeingTake | null {
  if (!isObj(raw)) return null;
  const brs: Record<string, unknown> = {};
  const olbi: Record<string, unknown> = {};
  BRS_ORDER.forEach((q, i) => { if (raw[`BRS_Q${i + 1}`] != null) brs[q] = raw[`BRS_Q${i + 1}`]; });
  OLBI_ORDER.forEach((q, i) => { if (raw[`OLBI_Q${i + 1}`] != null) olbi[q] = raw[`OLBI_Q${i + 1}`]; });
  return parseWellbeingTake({ brs, olbi });
}

export function parseWellbeing(humanDd: unknown): { pre: WellbeingTake | null; post: WellbeingTake | null } {
  const pt1 = isObj(humanDd) && isObj(humanDd.pt1) ? humanDd.pt1 : null;
  return { pre: pt1 ? parseNumberedWellbeing(pt1.pre) : null, post: pt1 ? parseNumberedWellbeing(pt1.post) : null };
}

// ---------- Retos ----------

/** "3 — Active pain point" -> 3 ; "0" -> 0 ; otro -> null. */
const ratingOf = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = typeof v === "string" ? /^\s*(\d+)/.exec(v) : null;
  return m ? Number(m[1]) : null;
};
const sectionLabel = (s: string) => humanize(s).replace(/^\w/, (c) => c.toUpperCase());

export function parseChallenge(raw: unknown, founderName: string): MenorcaChallenge | null {
  if (!isObj(raw) || !isObj(raw.sections)) return null;
  const items: MenorcaChallenge["items"] = [];
  const clarifications: MenorcaChallenge["clarifications"] = [];
  for (const [sec, body] of Object.entries(raw.sections)) {
    if (!isObj(body)) continue;
    const section = sectionLabel(sec);
    if (isObj(body.ratings)) {
      for (const [item, v] of Object.entries(body.ratings)) {
        const rating = ratingOf(v);
        if (rating !== null) items.push({ section, item, rating, text: typeof v === "string" ? v : String(v) });
      }
    }
    const c = str(body.clarification);
    if (c) clarifications.push({ section, text: c });
  }
  const dd = isObj(raw.deep_dive) ? raw.deep_dive : {};
  return {
    founderName, items, clarifications,
    name: str(dd.challenge_name), decision: str(dd.decision), hypothesis: str(dd.hypothesis),
    helpNeeded: str(dd.help_needed), expertiseWanted: str(dd.expertise_wanted), completedAt: str(raw.submitted_at),
  };
}

// ---------- Ensamblado ----------

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function startupKey(r: RawProgramDd): string {
  if (r.company_id) return r.company_id;
  const name = str(r.company_name);
  return name ? `n-${slug(name)}` : NO_STARTUP_ID;
}

function avgTake(takes: WellbeingTake[]): WellbeingTake | null {
  if (!takes.length) return null;
  const m = (f: (t: WellbeingTake) => number | null) => mean(takes.map(f).filter((v): v is number => v !== null));
  return { exhaustion: m((t) => t.exhaustion), disengagement: m((t) => t.disengagement), resilience: m((t) => t.resilience), completedAt: null };
}

export function buildMenorcaDashboard(rows: RawProgramDd[], now: Date = new Date()): MenorcaDashboardData {
  const founders = new Map<string, { name: string; key: string; f: MenorcaFounder; team: Partial<Record<MenorcaTeamKey, MenorcaSample[]>> }[]>();
  const names = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const md = isObj(r.metadata) ? r.metadata : {};
    const key = startupKey(r);
    const fullName = str(r.person_name)?.replace(/\s+/g, " ") ?? "Sin nombre";

    const lists = [parseListSource(md.paellas, "paellas"), parseListSource(md.decelera_games, "games")];
    const compact = parseCompact(md.human_dd_compact);
    const soft: MenorcaFounder["soft"] = {};
    const evaluators = new Set<string>();
    let samples = 0;
    for (const k of SOFT_KEYS) {
      const all = [...lists.flatMap((l) => l[k] ?? []), ...(compact.soft[k] ?? [])];
      const st = statOf(all);
      if (st) soft[k] = st;
      for (const s of all) if (s.evaluator) evaluators.add(s.evaluator);
    }
    for (const src of [md.paellas, md.decelera_games]) {
      if (isObj(src)) samples += Array.isArray(src.evaluator) ? src.evaluator.length : src.evaluator != null ? 1 : 0;
    }
    samples += Array.isArray(md.human_dd_compact) ? md.human_dd_compact.length : md.human_dd_compact ? 1 : 0;

    const founder: MenorcaFounder = {
      personId: r.person_id ?? `row-${r.id}`,
      fullName,
      startupId: key,
      soft,
      niche: statOf(compact.niche),
      evaluators: [...evaluators].sort((a, b) => a.localeCompare(b, "es")),
      samples,
      legalMaze: parseLegalMaze(md.legal_maze),
      wellbeing: parseWellbeing(r.human_dd),
      challenge: parseChallenge(md.challenges, fullName),
    };
    founders.set(key, [...(founders.get(key) ?? []), { name: fullName, key, f: founder, team: compact.team }]);
    const nm = str(r.company_name);
    if (nm) {
      const c = names.get(key) ?? new Map<string, number>();
      c.set(nm, (c.get(nm) ?? 0) + 1);
      names.set(key, c);
    }
  }

  const startups: MenorcaStartup[] = [...founders].map(([key, list]) => {
    const fs = list.map((x) => x.f).sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    const counts = names.get(key);
    const name = counts ? [...counts].sort((a, b) => b[1] - a[1])[0][0] : "Sin startup";

    const team: MenorcaStartup["team"] = {};
    for (const k of TEAM_KEYS) {
      const st = statOf(list.flatMap((x) => x.team[k] ?? []));
      if (st) team[k] = st;
    }
    const softAvg: MenorcaStartup["softAvg"] = {};
    for (const k of SOFT_KEYS) {
      const m = mean(fs.map((f) => f.soft[k]?.avg).filter((v): v is number => v !== undefined));
      if (m !== null) softAvg[k] = m;
    }
    const legalKeys = new Map<string, number[]>();
    for (const f of fs) for (const m of f.legalMaze?.metrics ?? []) legalKeys.set(m.key, [...(legalKeys.get(m.key) ?? []), m.value]);
    const legalAvg = [...legalKeys].map(([k, vs]) => ({ key: k, value: mean(vs)! }));

    const pre = fs.map((f) => f.wellbeing.pre).filter((t): t is WellbeingTake => !!t);
    const post = fs.map((f) => f.wellbeing.post).filter((t): t is WellbeingTake => !!t);
    return {
      startupId: key, name, founders: fs, team, softAvg, legalAvg,
      wellbeing: { pre: avgTake(pre), post: avgTake(post), nPre: pre.length, nPost: post.length },
      coverage: {
        founders: fs.length,
        withSoft: fs.filter((f) => Object.keys(f.soft).length > 0).length,
        withLegalMaze: fs.filter((f) => f.legalMaze).length,
        withWellbeingPre: pre.length,
        withWellbeingPost: post.length,
        withChallenge: fs.filter((f) => f.challenge).length,
      },
    };
  });
  startups.sort((a, b) => (a.startupId === NO_STARTUP_ID ? 1 : b.startupId === NO_STARTUP_ID ? -1 : a.name.localeCompare(b.name, "es")));
  return { generatedAt: now.toISOString(), startups };
}
