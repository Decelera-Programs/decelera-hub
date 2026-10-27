import { legalMazeFlags } from "@/lib/hdd/aggregate";
import type { FounderHdd, SoftKpiKey, WellbeingTake } from "@/lib/hdd/types";
import { fmt, HARD_KEYS, HARD_LABEL, SOFT_KEYS, SOFT_LABEL } from "./labels";

export interface ProfileLine { tone: "good" | "watch" | "neutral"; label: string; text: string }

type PeerAvg = Partial<Record<SoftKpiKey, number>> | undefined;

const signed = (d: number) => `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`;
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}` : xs[0]);

/**
 * Síntesis automática por reglas sobre los datos del founder (NO es una lectura del doc ni una puntuación):
 * soft skills frente a la media del resto, hard skills, señal del Legal Maze y bienestar.
 */
export function buildProfile(f: FounderHdd, peer: PeerAvg): ProfileLine[] {
  const out: ProfileLine[] = [];

  const soft = SOFT_KEYS.filter((k) => f.soft[k] != null).map((k) => ({ k, v: f.soft[k]!.avg, p: peer?.[k] }));
  if (soft.length >= 3) {
    // Con media del resto, se ordena por diferencia (lo que destaca); sin ella, por valor absoluto.
    const score = (x: (typeof soft)[number]) => (x.p != null ? x.v - x.p : x.v);
    const sorted = [...soft].sort((a, b) => score(b) - score(a));
    const desc = (x: (typeof soft)[number]) => `${SOFT_LABEL[x.k]} (${fmt(x.v)}${x.p != null ? `, ${signed(x.v - x.p)} vs resto` : ""})`;
    const top = sorted.slice(0, 2).filter((x) => (x.p != null ? x.v - x.p >= 0.5 : x.v >= 7));
    const low = sorted.slice(-2).reverse().filter((x) => (x.p != null ? x.v - x.p <= -0.5 : x.v <= 5));
    if (top.length) out.push({ tone: "good", label: "Destaca en", text: list(top.map(desc)) });
    if (low.length) out.push({ tone: "watch", label: "Por debajo en", text: list(low.map(desc)) });
    if (!top.length && !low.length) out.push({ tone: "neutral", label: "Soft skills", text: "Perfil homogéneo, sin diferencias marcadas con el resto." });
  } else {
    out.push({ tone: "neutral", label: "Soft skills", text: "Aún sin evaluaciones suficientes." });
  }

  const hard = HARD_KEYS.filter((k) => typeof f.hard[k] === "number").map((k) => ({ k, v: f.hard[k]! }));
  if (hard.length >= 2) {
    const s = [...hard].sort((a, b) => b.v - a.v);
    const hi = s[0], lo = s[s.length - 1];
    out.push(
      hi.v - lo.v >= 2
        ? { tone: "neutral", label: "Hard skills", text: `Más fuerte en ${HARD_LABEL[hi.k]} (${fmt(hi.v)}), más débil en ${HARD_LABEL[lo.k]} (${fmt(lo.v)}).` }
        : { tone: "neutral", label: "Hard skills", text: `Equilibrado (${hard.map((h) => `${HARD_LABEL[h.k]} ${fmt(h.v)}`).join(", ")}).` },
    );
  }

  const lm = f.legalMaze;
  if (!lm || !lm.dilemmas.length) {
    out.push({ tone: "neutral", label: "Legal Maze", text: "Sin completar." });
  } else if (legalMazeFlags(lm.dilemmas).d1ChoseA) {
    out.push({ tone: "watch", label: "Legal Maze", text: "Eligió A en el Dilema 1, la casilla que más pesa según el doc: conviene hablarlo." });
  } else {
    out.push({ tone: "neutral", label: "Legal Maze", text: "Sin señales marcadas por el doc. Revisa la lectura de cada dilema." });
  }

  const { pre, post } = f.wellbeing;
  const now: WellbeingTake | null = post ?? pre;
  if (now) {
    const bits: string[] = [];
    let tone: ProfileLine["tone"] = "neutral";
    const high = (["exhaustion", "disengagement"] as const).filter((m) => (now[m] ?? 0) > 2.5);
    if (high.length) { tone = "watch"; bits.push(`${high.map((m) => (m === "exhaustion" ? "Exhaustion" : "Disengagement")).join(" y ")} por encima del punto medio (2,5)`); }
    if (now.resilience != null) {
      if (now.resilience < 3) { tone = "watch"; bits.push(`resiliencia baja (${fmt(now.resilience, 2)})`); }
      else if (now.resilience > 4.3) { if (tone === "neutral") tone = "good"; bits.push(`resiliencia alta (${fmt(now.resilience, 2)})`); }
    }
    if (pre && post) {
      const worse = (["exhaustion", "disengagement"] as const).filter((m) => pre[m] != null && post[m] != null && post[m]! - pre[m]! >= 0.25);
      const better = (["exhaustion", "disengagement"] as const).filter((m) => pre[m] != null && post[m] != null && pre[m]! - post[m]! >= 0.25);
      if (worse.length) { tone = "watch"; bits.push(`empeora ${worse.join(" y ")} tras el programa`); }
      if (better.length && tone !== "watch") { tone = "good"; bits.push(`mejora ${better.join(" y ")} tras el programa`); }
    }
    out.push({ tone, label: "Bienestar", text: bits.length ? `${bits.join("; ")}.` : "Sin cambios relevantes." });
  }

  return out;
}
