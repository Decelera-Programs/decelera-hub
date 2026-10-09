// Ejecutar: node --test src/lib/hdd/aggregate.test.mjs  (Node >= 22.6 con type stripping)
import test from "node:test";
import assert from "node:assert/strict";
import { LEGAL_MAZE_CONTENT } from "./legalMazeContent.ts";
import {
  LEGAL_DILEMMAS, aggregateSoft, aggregateTeam, aggregateHard, parseLegalMaze, parseWellbeingTake, buildHddDashboard, NO_STARTUP_ID,
  legalMazeFlags, brsBand, scatterTake, buildScatterPoints, scatterSeries, scatterQuadrant,
  OLBI_ITEMS, BRS_ITEMS,
} from "./aggregate.ts";

const ev = (event, scores, id = "e1") => ({ event, evaluatorId: id, evaluatorName: null, submissionDate: null, scores });

test("aggregateSoft: media global y por evento, ignora KPIs ausentes", () => {
  const s = aggregateSoft([ev("Workstations", { leadership: 8 }), ev("Cooking Contest", { leadership: 6, doer: 9 }), ev("Cooking Contest", { leadership: 7 })]);
  assert.equal(s.leadership.avg, 7);
  assert.equal(s.leadership.n, 3);
  assert.deepEqual(s.leadership.byEvent["Cooking Contest"], { avg: 6.5, n: 2 });
  assert.equal(s.doer.n, 1);
  assert.equal(s.integrity, undefined);
});

test("aggregateTeam: mezcla EM (sin evento) y Decelera Games", () => {
  const t = aggregateTeam([{ event: null, scores: { vision_alignment: 6 } }, { event: "Decelera Games", scores: { vision_alignment: 8 } }]);
  assert.equal(t.vision_alignment.avg, 7);
  assert.deepEqual(t.vision_alignment.byEvent, { "Decelera Games": { avg: 8, n: 1 } });
});

test("aggregateHard: renombra claves y promedia submissions", () => {
  const m = aggregateHard([{ p1: { niche: 8, tech: 6, gtm: 4 } }, { p1: { niche: 6, tech: 6, gtm: 6 } }, null]);
  assert.deepEqual(m.get("p1"), { niche_experience: 7, tech_experience: 6, go_to_market_experience: 5 });
});

const lm = (choices, opens = []) => ({
  version: 2, submitted_at: "2026-10-06T15:00:00Z",
  answers: Object.fromEntries(choices.map((c, i) => [`d${i + 1}`, { choice: c, votes: [0, 1, 2].map((o) => o === c), open: opens[i] ?? "" }])),
});

test("parseLegalMaze: lee choice, KPI por dilema (D3 = Confianza) y texto abierto", () => {
  assert.equal(parseLegalMaze(null), null);
  assert.equal(parseLegalMaze({}), null);
  const r = parseLegalMaze(lm([0, 2, 1, 2, 2], [" hola ", "", "", "", ""]));
  assert.deepEqual(r.dilemmas.map((d) => d.choice), [0, 2, 1, 2, 2]);
  assert.deepEqual(r.dilemmas[0], { id: "D1", title: "Socios", kpiLabel: "Integridad", answer: "hola", choice: 0 });
  assert.equal(r.dilemmas[1].answer, null);
  assert.equal(r.completedAt, "2026-10-06T15:00:00Z");
  assert.deepEqual(r.dilemmas.map((d) => d.kpiLabel), ["Integridad", "Ambición", "Confianza", "Pensamiento no convencional", "Integridad"]);
  assert.ok(r.dilemmas.every((d) => !("votes" in d)), "votes se ignora");
});

test("parseLegalMaze: choice fuera de rango o de otro tipo se ignora; sin choice válido = sin responder", () => {
  const bad = parseLegalMaze({ version: 2, answers: { d1: { choice: 3, open: "x" }, d2: { choice: -1 }, d3: { choice: "1" }, d4: { choice: 1.5 }, d5: { choice: 1 } } });
  assert.deepEqual(bad.dilemmas.map((d) => d.choice), [null, null, null, null, 1]);
  assert.equal(bad.dilemmas[0].answer, "x");
  assert.equal(parseLegalMaze({ version: 2, answers: { d1: { choice: 7 }, d2: { choice: null } } }), null);
  // dato antiguo (solo votos, sin choice): sin responder
  assert.equal(parseLegalMaze({ version: 1, answers: { d1: { votes: [false, false, true], open: "" } } }), null);
  assert.equal(parseLegalMaze({ answers: { d1: { votes: [true, false, false], open: "x" } } }), null);
});

test("legalMazeFlags: solo D1 = A", () => {
  assert.deepEqual(legalMazeFlags(parseLegalMaze(lm([0, 2, 2, 2, 2])).dilemmas), { d1ChoseA: true });
  assert.deepEqual(legalMazeFlags(parseLegalMaze(lm([1, 0, 0, 0, 0])).dilemmas), { d1ChoseA: false });
  assert.deepEqual(legalMazeFlags(parseLegalMaze(lm([2, 2, 2, 2, 2])).dilemmas), { d1ChoseA: false });
});

test("legalMazeContent: 5 dilemas x 3 opciones A/B/C coherentes con los KPIs y con el form", () => {
  assert.deepEqual(LEGAL_MAZE_CONTENT.map((c) => c.id), ["D1", "D2", "D3", "D4", "D5"]);
  for (const c of LEGAL_MAZE_CONTENT) {
    assert.equal(c.kpiLabel, LEGAL_DILEMMAS[c.id].kpiLabel);
    assert.deepEqual(c.options.map((o) => o.letter), ["A", "B", "C"]);
    for (const o of c.options) assert.ok(o.short && o.text && o.positive && o.negative);
  }
  assert.equal(LEGAL_MAZE_CONTENT[2].kpiLabel, "Confianza");
  assert.ok(LEGAL_MAZE_CONTENT[0].options[0].text.startsWith("Formalizas el acuerdo ahora")); // choice 0 = A = opción 1
});

test("parseWellbeingTake: OLBI 1-4 con inversos (5-x) y BRS 1-5 con inversos (6-x)", () => {
  assert.equal(parseWellbeingTake(null), null);
  assert.equal(parseWellbeingTake({ olbi: {}, brs: {} }), null);
  const t = parseWellbeingTake({
    submitted_at: "2026-05-21",
    olbi: {
      "When I work, I usually feel energised": "Strongly Agree", // inverso: 5-4 = 1
      "After my work, I usually feel worn out and weary": "Agree", // 3
      "Sometimes I feel sickened by my work tasks": "Disagree", // 2
      "I find my work to be a positive challenge": "Strongly Disagree", // inverso: 5-1 = 4
    },
    brs: { "I tend to bounce back quickly after hard times": "Agree", "I have a hard time making it through stressful events": "Disagree" },
  });
  assert.equal(t.exhaustion, 2); // (1 + 3) / 2
  assert.equal(t.disengagement, 3); // (2 + 4) / 2
  assert.equal(t.resilience, 4); // 4 y (6-2=4)
  assert.equal(t.completedAt, "2026-05-21");
});

test("OLBI/BRS: 8 + 8 ítems (4 inversos por subescala), 3 inversos en BRS; nunca hay total OLBI", () => {
  const uniq = Object.entries(OLBI_ITEMS).filter(([q]) => !q.includes("energized")).map(([, d]) => d);
  const by = (sc) => uniq.filter((d) => d.scale === sc);
  assert.equal(by("exhaustion").length, 8);
  assert.equal(by("disengagement").length, 8);
  assert.equal(by("exhaustion").filter((d) => d.rev).length, 4);
  assert.equal(by("disengagement").filter((d) => d.rev).length, 4);
  assert.equal(Object.keys(BRS_ITEMS).length, 6);
  assert.equal(Object.values(BRS_ITEMS).filter((d) => d.rev).length, 3);
  const t = parseWellbeingTake({ olbi: { "When I work, I usually feel energised": "Agree" } });
  assert.deepEqual(Object.keys(t).sort(), ["completedAt", "disengagement", "exhaustion", "resilience"]);
  assert.equal(t.disengagement, null);
  assert.equal(t.resilience, null);
});

test("OLBI: extremos 1-4; Neutral y 5 no existen en OLBI y se ignoran; BRS si admite Neutral", () => {
  const worst = { "There are days when I feel tired before I arrive at work": "Strongly Agree", "I can tolerate the pressure of my work very well": "Strongly Disagree" };
  assert.equal(parseWellbeingTake({ olbi: worst }).exhaustion, 4);
  assert.equal(parseWellbeingTake({ olbi: { "There are days when I feel tired before I arrive at work": "Neutral" } }), null);
  assert.equal(parseWellbeingTake({ olbi: { "There are days when I feel tired before I arrive at work": 5 } }), null);
  assert.equal(parseWellbeingTake({ brs: { "I tend to bounce back quickly after hard times": "Neutral" } }).resilience, 3);
});

test("BRS: media de 6 ítems con 2, 4 y 6 inversos y bandas 3,0 / 4,3", () => {
  const all5 = {
    "I tend to bounce back quickly after hard times": 5, "I have a hard time making it through stressful events": 1,
    "It does not take me long to recover from a stressful event": 5, "It is hard for me to snap back when something bad happens": 1,
    "I usually come through difficult times with little trouble": 5, "I tend to take a long time to get over setbacks in my life": 1,
  };
  assert.equal(parseWellbeingTake({ brs: all5 }).resilience, 5);
  const low = Object.fromEntries(Object.entries(all5).map(([q, v]) => [q, 6 - v]));
  assert.equal(parseWellbeingTake({ brs: low }).resilience, 1);
  assert.equal(brsBand(2.99), "baja");
  assert.equal(brsBand(3), "normal");
  assert.equal(brsBand(4.3), "normal");
  assert.equal(brsBand(4.31), "alta");
  assert.equal(brsBand(null), null);
});

test("scatter: solo tomas con BRS y Disengagement; modos pre/post/delta; cuadrantes", () => {
  assert.equal(scatterTake(null), null);
  assert.equal(scatterTake({ exhaustion: 2, disengagement: 2, resilience: null, completedAt: null }), null);
  assert.deepEqual(scatterTake({ exhaustion: null, disengagement: 2, resilience: 4, completedAt: null }), { resilience: 4, disengagement: 2, exhaustion: null });
  const take = (e, d, r) => ({ exhaustion: e, disengagement: d, resilience: r, completedAt: null });
  const f = (personId, fullName, pre, post) => ({ personId, fullName, photoUrl: null, startupId: "s1", soft: {}, evaluations: [], hard: {}, legalMaze: null, wellbeing: { pre, post } });
  const pts = buildScatterPoints([{
    startupId: "s1", name: "A", logoUrl: null, sector: null, team: {}, softAvg: {}, coverage: {},
    founders: [
      f("a", "Ana", take(2, 2, 4), take(1.5, 1.8, 4.4)), f("b", "Beto", take(3, 3, 2.5), take(2.5, 2.4, 3.2)),
      f("c", "Cris", take(2, 2, 3.5), take(2, 2, 3.8)), f("d", "Dani", take(2, 2.2, 3.1), null), f("e", "Eli", null, take(1.2, 1.4, 4.6)),
      f("g", "Gus", null, null), f("rod", "Rodrigo Paz", take(2.6, 3.4, 3), take(2.7, null, 3.2)),
    ],
  }]);
  const nPre = pts.filter((p) => p.pre).length;
  const nPost = pts.filter((p) => p.post).length;
  const nBoth = pts.filter((p) => p.pre && p.post).length;
  assert.deepEqual([nPre, nPost, nBoth], [5, 4, 3]);

  assert.equal(scatterSeries(pts, "pre").length, nPre);
  assert.equal(scatterSeries(pts, "post").length, nPost);
  const delta = scatterSeries(pts, "delta");
  assert.equal(delta.length, nBoth);
  assert.ok(delta.every((s) => s.pts.length === 2 && s.pts[0].kind === "pre" && s.pts[1].kind === "post"));
  const rod = pts.find((p) => p.fullName === "Rodrigo Paz"); // post sin Disengagement: no hay toma post en el scatter
  assert.ok(rod.pre && rod.post === null);
  for (const s of scatterSeries(pts, "pre")) for (const q of s.pts) {
    assert.ok(q.resilience >= 1 && q.resilience <= 5 && q.disengagement >= 1 && q.disengagement <= 4);
  }
  assert.equal(scatterQuadrant({ resilience: 4, disengagement: 1.5 }), "resiliente_comprometido");
  assert.equal(scatterQuadrant({ resilience: 2, disengagement: 1.5 }), "poco_resiliente_comprometido");
  assert.equal(scatterQuadrant({ resilience: 4, disengagement: 2.5 }), "resiliente_desconectado");
  assert.equal(scatterQuadrant({ resilience: 2.9, disengagement: 3 }), "poco_resiliente_desconectado");
});

test("parseWellbeingTake: acepta valores ya calculados", () => {
  const t = parseWellbeingTake({ exhaustion: 2.5, disengagement: 3, resilience: 4, completed_at: "d" });
  assert.deepEqual(t, { exhaustion: 2.5, disengagement: 3, resilience: 4, completedAt: "d" });
});

test("buildHddDashboard: coverage, Sin startup, team mezclado", () => {
  const d = buildHddDashboard({
    startups: [{ id: "s1", name: "A", logo_url: null, sector: null }],
    founders: [
      { id: "f1", full_name: "Ana", photo_url: null, startup_id: "s1", legal_maze: null, olbi_brs: { exhaustion: 2 }, olbi_brs_post: null },
      { id: "f2", full_name: "Bea", photo_url: null, startup_id: null, legal_maze: null, olbi_brs: null, olbi_brs_post: null },
    ],
    teamNames: { e1: "Eva" },
    humanDD: [
      { evaluator_id: "e1", event: "Workstations", founder_id: "f1", startup_id: "s1", scores: { leadership: 9, bogus: 3, doer: 11 }, submission_date: "2026-10-05" },
      { evaluator_id: "e1", event: "Decelera Games", founder_id: null, startup_id: "s1", scores: { vision_alignment: 8 }, submission_date: null },
    ],
    submissions: [{ startup_id: "s1", team_kpis: { vision_alignment: 6 }, hard_skills: { f1: { niche: 7, tech: 7, gtm: 7 } } }],
  });
  assert.equal(d.startups.length, 2);
  assert.equal(d.startups.at(-1).startupId, NO_STARTUP_ID);
  const s1 = d.startups[0];
  assert.deepEqual(s1.coverage, { founders: 1, withSoft: 1, withLegalMaze: 0, withWellbeingPre: 1, withWellbeingPost: 0 });
  assert.equal(s1.team.vision_alignment.avg, 7);
  assert.equal(s1.founders[0].soft.doer, undefined); // 11 fuera de rango
  assert.equal(s1.founders[0].evaluations[0].evaluatorName, "Eva");
  assert.equal(s1.softAvg.leadership, 9);
  assert.equal(s1.founders[0].hard.niche_experience, 7);
});
