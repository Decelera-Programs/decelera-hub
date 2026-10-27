// Ejecutar: node --test src/lib/hdd/legalScore.test.mjs  (Node >= 22.6 con type stripping)
import test from "node:test";
import assert from "node:assert/strict";
import { blendLegal, legalSoftScores } from "./legalScore.ts";

const founder = (choices, soft) => ({
  personId: "p", fullName: "Ana", photoUrl: null, startupId: "s", soft, evaluations: [], hard: {}, wellbeing: { pre: null, post: null },
  legalMaze: { completedAt: null, dilemmas: Object.entries(choices).map(([id, choice]) => ({ id, title: id, kpiLabel: "", answer: null, choice })) },
});
const stat = (avg) => ({ avg, n: 2, byEvent: {} });

test("puntúa D1-D4 según la opción elegida y se salta D5 y los sin respuesta", () => {
  const f = founder({ D1: 2, D2: 0, D3: 0, D4: 1, D5: 0 });
  assert.deepEqual(legalSoftScores(f), { integrity: 10, ambition_purpose: 3, self_confidence: 9, unconventional_thinking: 2 });
  assert.deepEqual(legalSoftScores(founder({ D1: null })), {});
});

test("mezcla con la evaluación del equipo; sin evaluación vale solo el Legal Maze", () => {
  const f = founder({ D1: 2, D2: 2 }, { integrity: stat(7), leadership: stat(5) });
  const b = blendLegal(f);
  assert.equal(b.soft.integrity.avg, 8.5); // (7 + 10) / 2
  assert.equal(b.soft.integrity.n, 2);
  assert.equal(b.soft.leadership.avg, 5); // no la mide el Legal Maze
  assert.deepEqual(b.soft.ambition_purpose, { avg: 9, n: 0, byEvent: {} }); // sin evaluación del equipo: solo la nota del Legal Maze
  assert.equal(f.soft.integrity.avg, 7); // no muta el original
});
