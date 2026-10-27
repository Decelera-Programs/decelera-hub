import type { FounderHdd, SoftKpiKey } from "./types";

// Puntuación del Legal Maze (1-10) por opción elegida [A, B, C]. El doc "26MEX Legal maze v3 DEF" NO puntúa: solo da una lectura
// Positivo/Negativo por opción. Esta tabla es criterio de Decelera (acordado con Carlos), para poder mezclar el Legal Maze con las
// soft skills que mide. D5 no puntúa (nadie lo contestó). "Confianza" (D3) se lee como Self Confidence.
export const LEGAL_SOFT: Record<string, SoftKpiKey> = {
  D1: "integrity", D2: "ambition_purpose", D3: "self_confidence", D4: "unconventional_thinking",
};
export const LEGAL_SCORE: Record<string, readonly [number, number, number]> = {
  D1: [1, 3, 10],
  D2: [3, 4, 9],
  D3: [9, 6, 3],
  D4: [6, 2, 8],
};

/** Puntuación del Legal Maze por soft skill (media si más de un dilema la mide). Solo skills con algún dilema puntuado y contestado. */
export function legalSoftScores(f: FounderHdd): Partial<Record<SoftKpiKey, number>> {
  const by: Partial<Record<SoftKpiKey, number[]>> = {};
  for (const d of f.legalMaze?.dilemmas ?? []) {
    const skill = LEGAL_SOFT[d.id];
    const row = LEGAL_SCORE[d.id];
    if (!skill || !row || d.choice === null) continue;
    (by[skill] ??= []).push(row[d.choice]);
  }
  const out: Partial<Record<SoftKpiKey, number>> = {};
  for (const [k, v] of Object.entries(by) as [SoftKpiKey, number[]][]) out[k] = v.reduce((a, b) => a + b, 0) / v.length;
  return out;
}

/**
 * Copia del founder con cada soft skill que mide el Legal Maze = media de la evaluación del equipo y el Legal Maze.
 * Si la skill no tiene evaluación del equipo, vale solo la nota del Legal Maze (con `n: 0`). `n` y `byEvent` no cambian.
 */
export function blendLegal(f: FounderHdd): FounderHdd {
  const lm = legalSoftScores(f);
  const soft = { ...f.soft };
  for (const [k, score] of Object.entries(lm) as [SoftKpiKey, number][]) {
    const s = f.soft[k];
    soft[k] = s && s.n > 0 ? { ...s, avg: (s.avg + score) / 2 } : { avg: score, n: 0, byEvent: {} };
  }
  return { ...f, soft };
}

export type LegalTone = "good" | "mid" | "bad";

/** Semáforo de la conclusión de una opción: 7 o más verde, 4 a 6 amarillo, 3 o menos rojo. */
export function legalTone(score: number): LegalTone {
  return score >= 7 ? "good" : score >= 4 ? "mid" : "bad";
}
