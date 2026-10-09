import { buildHddDashboard, HDD_EVENTS, SOFT_KEYS, TEAM_KEYS, type RawFounder, type RawHumanDD, type RawSubmission } from "./aggregate";
import type { HddDashboardData, HddEvent, SoftKpiKey } from "./types";

// Datos de ejemplo deterministas (para desarrollar la UI con HDD_USE_MOCK=1). Pasan por buildHddDashboard,
// así que tienen exactamente la forma que producirá la base real.

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const score = (base: number) => Math.max(1, Math.min(10, Math.round(base + (rnd() - 0.5) * 4)));

const EVENT_KPIS: Record<HddEvent, SoftKpiKey[]> = {
  Workstations: ["leadership", "self_confidence", "openness_coachability", "ambition_purpose"],
  "Cooking Contest": ["leadership", "self_confidence", "cool_head", "unconventional_thinking", "doer", "resilience", "openness_coachability"],
  "Decelera Games": SOFT_KEYS,
};
const EVALUATORS: [string, string][] = [["ev1", "Marcos"], ["ev2", "Lorenzo"], ["ev3", "Raquel"], ["ev4", "Carlota"]];

// ---- OLBI (4 opciones, 1-4) y BRS (5 opciones, 1-5): mismos textos que el form real ----
const OLBI4 = ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"];
const BRS5 = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
// [texto, inverso]
const OLBI_EXH: [string, boolean][] = [
  ["There are days when I feel tired before I arrive at work", false],
  ["After work, I tend to need more time than in the past in order to relax and feel better", false],
  ["I can tolerate the pressure of my work very well", true],
  ["During my work, I often feel emotionally drained", false],
  ["After working, I have enough energy for my leisure activities", true],
  ["After my work, I usually feel worn out and weary", false],
  ["Usually, I can manage the amount of my work well", true],
  ["When I work, I usually feel energised", true],
];
const OLBI_DIS: [string, boolean][] = [
  ["I always find new and interesting aspects in my work", true],
  ["It happens more and more often that I talk about my work in a negative way", false],
  ["Lately, I tend to think less at work and do my job almost mechanically", false],
  ["I find my work to be a positive challenge", true],
  ["Over time, one can become disconnected from this type of work", false],
  ["Sometimes I feel sickened by my work tasks", false],
  ["This is the only type of work that I can imagine myself doing", true],
  ["I feel more and more engaged in my work", true],
];
const BRS_Q: [string, boolean][] = [
  ["I tend to bounce back quickly after hard times", false],
  ["I have a hard time making it through stressful events", true],
  ["It does not take me long to recover from a stressful event", false],
  ["It is hard for me to snap back when something bad happens", true],
  ["I usually come through difficult times with little trouble", false],
  ["I tend to take a long time to get over setbacks in my life", true],
];
/** Respuesta de texto cuyo valor recodificado (más alto = peor en OLBI, mejor en BRS) ronda `target`. */
const answers = (qs: [string, boolean][], labels: string[], target: number) =>
  Object.fromEntries(qs.map(([q, rev]) => {
    const max = labels.length;
    const t = Math.max(1, Math.min(max, Math.round(target + (rnd() - 0.5) * 1.2)));
    return [q, labels[(rev ? max + 1 - t : t) - 1]];
  }));

/** [exhaustion 1-4, disengagement 1-4, resilience 1-5]; null en un eje = ese bloque sin responder. */
type Take = [number | null, number | null, number | null];
const wellbeing = (date: string, [exh, dis, res]: Take) => ({
  submitted_at: date,
  olbi: { ...(exh !== null ? answers(OLBI_EXH, OLBI4, exh) : {}), ...(dis !== null ? answers(OLBI_DIS, OLBI4, dis) : {}) },
  brs: res !== null ? answers(BRS_Q, BRS5, res) : {},
});

// ---- Legal Maze: patrones de votos por founder (V = true, R = false) ----
const V = (s: string) => [...s].map((c) => c === "V");
const OPEN_TXT = "Lo hablaría con mi socio antes de decidir nada.";
type Maze = [string, string][]; // por dilema D1..D5: [patrón, texto abierto]
const maze = (m: Maze) => ({
  version: 1, submitted_at: "2026-10-06T15:00:00Z",
  answers: Object.fromEntries(m.map(([p, open], i) => [`d${i + 1}`, { votes: V(p), open }])),
});
// Versión 2 (form actual): una elección por dilema (0 = A, 1 = B, 2 = C); votes solo es true en la elegida.
type Choices = [0 | 1 | 2, string][];
const mazeV2 = (m: Choices) => ({
  version: 2, submitted_at: "2026-10-06T15:00:00Z",
  answers: Object.fromEntries(m.map(([choice, open], i) => [`d${i + 1}`, { choice, votes: [0, 1, 2].map((o) => o === choice), open }])),
});
const MAZES_V2: Record<string, Choices> = {
  v2c: [[2, ""], [2, OPEN_TXT], [1, ""], [2, ""], [2, ""]],
  v2a: [[0, "Lo formalizaría primero."], [1, ""], [2, ""], [0, ""], [1, ""]],
};
const MAZES: Record<string, Maze> = {
  solido: [["RRV", ""], ["RRV", ""], ["RRV", ""], ["RRV", ""], ["RRV", ""]],
  comun: [["RRV", OPEN_TXT], ["RVV", ""], ["RVV", ""], ["RRV", ""], ["RVV", ""]],
  d1verde: [["VRR", ""], ["RVV", ""], ["RRV", ""], ["RVR", ""], ["RRV", ""]],
  indeciso: [["RRR", ""], ["RRR", OPEN_TXT], ["RRV", ""], ["VRV", ""], ["RRR", ""]],
  raro: [["RRV", ""], ["VVR", "Tenía otra salida en mente."], ["VVV", ""], ["RVV", ""], ["RRV", ""]],
};

// [nombre, nivel soft (null = sin datos), maze, olbi/brs pre, olbi/brs post, eventos evaluados]
type FounderSpec = [string, number | null, keyof typeof MAZES | keyof typeof MAZES_V2 | null, Take | null, Take | null, HddEvent[]];
const SPEC: [string, string, string, FounderSpec[]][] = [
  ["s1", "Nubia Health", "HealthTech", [
    ["Ana Torres", 8, "solido", [1.8, 1.7, 4.4], [1.6, 1.5, 4.6], HDD_EVENTS],
    ["Diego Ramos", 6.5, "comun", [2.9, 2.6, 3.3], [2.4, 2.1, 3.8], HDD_EVENTS],
    ["Lucía Vega", 7.5, "v2c", [2.2, 2.0, 3.9], null, HDD_EVENTS], // solo pre
  ]],
  ["s2", "AgroSense", "AgriTech", [
    ["Mateo Cruz", 5.5, "d1verde", [3.2, 3.1, 2.4], [3.0, 3.3, 2.6], ["Workstations", "Cooking Contest"]],
    ["Sofía Ibarra", 7, "v2a", [2.0, 1.9, 4.1], [2.1, 2.2, 3.7], ["Workstations"]],
  ]],
  ["s3", "PagaYa", "FinTech", [
    ["Javier Soto", 4.5, "indeciso", [3.5, 3.0, 2.2], [2.8, 2.5, 3.1], ["Cooking Contest"]],
    ["Valeria Núñez", null, null, null, null, []], // sin ningún dato
    ["Iván Prieto", 6, "raro", null, [2.5, 2.4, 3.5], ["Workstations"]], // solo post
  ]],
  ["s4", "Logística Verde", "Logistics", [
    ["Camila Ortiz", 7, "v2c", [2.4, 2.8, 3.6], [2.0, 2.2, 4.2], HDD_EVENTS],
    ["Rodrigo Paz", 5, "solido", [2.6, 3.4, 3.0], [2.7, null, 3.2], ["Workstations", "Decelera Games"]], // post incompleto: sin Disengagement
  ]],
];

export function mockHddDashboardData(): HddDashboardData {
  seed = 7;
  const startups = SPEC.map(([id, name, sector]) => ({ id, name, logo_url: null, sector }));
  const founders: RawFounder[] = [];
  const humanDD: RawHumanDD[] = [];
  const submissions: RawSubmission[] = [];

  for (const [sid, , , fs] of SPEC) {
    const hard: Record<string, { niche: number; tech: number; gtm: number }> = {};
    fs.forEach(([name, level, mz, pre, post, events], i) => {
      const fid = `${sid}-f${i + 1}`;
      founders.push({
        id: fid, full_name: name, photo_url: null, startup_id: sid,
        legal_maze: mz ? (mz in MAZES_V2 ? mazeV2(MAZES_V2[mz]) : maze(MAZES[mz])) : null,
        olbi_brs: pre ? wellbeing("2026-09-28T10:00:00Z", pre) : null,
        olbi_brs_post: post ? wellbeing("2026-10-08T10:00:00Z", post) : null,
      });
      if (level === null) return;
      for (const ev of events) {
        for (const [evId] of EVALUATORS.slice(0, ev === "Workstations" ? 3 : 2)) {
          humanDD.push({
            evaluator_id: evId, event: ev, founder_id: fid, startup_id: sid,
            submission_date: ev === "Workstations" ? "2026-10-05" : ev === "Cooking Contest" ? "2026-10-06" : "2026-10-07",
            scores: Object.fromEntries(EVENT_KPIS[ev].map((k) => [k, score(level)])),
          });
        }
      }
      hard[fid] = { niche: score(level), tech: score(level), gtm: score(level - 1) };
    });
    if (fs.some((f) => f[1] !== null)) {
      submissions.push({ startup_id: sid, hard_skills: hard, team_kpis: Object.fromEntries(TEAM_KEYS.map((k) => [k, score(6.5)])) });
      // Decelera Games a nivel equipo (founder_id NULL) solo en algunas startups
      if (sid !== "s3") {
        humanDD.push({ evaluator_id: "ev2", event: "Decelera Games", founder_id: null, startup_id: sid, submission_date: "2026-10-07", scores: Object.fromEntries(TEAM_KEYS.map((k) => [k, score(7)])) });
      }
    }
  }

  return buildHddDashboard({ startups, founders, humanDD, submissions, teamNames: Object.fromEntries(EVALUATORS), now: new Date() });
}
