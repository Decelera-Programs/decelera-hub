/**
 * OKR de la empresa (vista /estrategia). Tipos + lógica pura (sin acceso a datos, usable en cliente).
 *
 * Modelo: un árbol objetivo → KR → iniciativa (`hub.okr_items`). Cada nodo puede tener una métrica
 * propia (baseline, metas por trimestre, reales por trimestre). El avance de un nodo es el de su
 * métrica si ya tiene datos reales; si no, la media del avance de sus hijos. Así lo que se mide en
 * las iniciativas sube solo hasta los objetivos.
 */
import type { ProjectHealth } from "@/lib/projects";

export type OkrKind = "objective" | "kr" | "initiative";
export type OkrUnit = "eur_m" | "pct" | "count" | "bool" | "weeks" | "per_week" | "score";
export type Quad<T> = [T, T, T, T];

export const OKR_YEAR = 2027;
export const OKR_UNITS: OkrUnit[] = ["eur_m", "pct", "count", "bool", "weeks", "per_week", "score"];
export const UNIT_LABEL: Record<OkrUnit, string> = {
  eur_m: "€ millones",
  pct: "Porcentaje",
  count: "Número",
  bool: "Sí / No",
  weeks: "Semanas",
  per_week: "Por semana",
  score: "Puntuación",
};

export type OkrItem = {
  id: string;
  year: number;
  parentId: string | null;
  kind: OkrKind;
  position: number;
  code: string;
  title: string;
  group: string | null;
  owner: string;
  unit: OkrUnit;
  /** "down" = menos es mejor (p.ej. semanas de ciclo). */
  direction: "up" | "down";
  baseline: number | null;
  target: number | null;
  targets: Quad<number | null>;
  actuals: Quad<number | null>;
  keyProject: string;
  notes: string;
  /** Proyectos del Hub enlazados a este nodo. */
  projectIds: string[];
};

/** Proyecto del Hub reducido a lo que necesita la vista. */
export type OkrProject = {
  id: string;
  title: string;
  health: ProjectHealth;
  team: string | null;
  tasksDone: number;
  tasksTotal: number;
  endDate: string | null;
};

export type OkrStatus = "done" | "on_track" | "at_risk" | "off_track" | "pending" | "none";

export const STATUS_LABEL: Record<OkrStatus, string> = {
  done: "Cumplido",
  on_track: "En ritmo",
  at_risk: "En riesgo",
  off_track: "Fuera de ritmo",
  pending: "Aún no toca",
  none: "Sin medir",
};
export const STATUS_COLOR: Record<OkrStatus, string> = {
  done: "var(--brand-sea)",
  on_track: "var(--status-good)",
  at_risk: "var(--status-warning)",
  off_track: "var(--status-critical)",
  pending: "var(--text-muted)",
  none: "var(--baseline)",
};

export const KIND_LABEL: Record<OkrKind, string> = { objective: "Objetivo", kr: "KR", initiative: "Iniciativa" };

export type OkrNode = {
  item: OkrItem;
  children: OkrNode[];
  /** 0–1 o null si no hay nada medible. */
  progress: number | null;
  /** Avance que tocaría llevar hoy según las metas trimestrales (0–1) o null. */
  expected: number | null;
  status: OkrStatus;
  /** Valor actual y trimestre del último dato real (null = baseline / sin dato). */
  value: number | null;
  valueQuarter: number | null;
  /** Proyectos enlazados al nodo o a cualquiera de sus descendientes. */
  projects: OkrProject[];
  /** Cuántos de esos proyectos están bloqueados / en riesgo (señal de alerta que sube por el árbol). */
  blocked: number;
  atRisk: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Último dato real del año (el trimestre más avanzado que tenga valor). */
export function latestActual(item: OkrItem): { value: number; quarter: number } | null {
  for (let q = 3; q >= 0; q--) {
    const v = item.actuals[q];
    if (v != null) return { value: v, quarter: q };
  }
  return null;
}

/** Punto de partida de la métrica: baseline, o 0 si no se midió (los "de cero a meta"). */
function startOf(item: OkrItem): number | null {
  if (item.baseline != null) return item.baseline;
  return item.direction === "up" ? 0 : null;
}

function fraction(value: number, start: number, target: number, dir: "up" | "down"): number {
  if (target === start) return value === target ? 1 : dir === "up" ? (value >= target ? 1 : 0) : value <= target ? 1 : 0;
  return clamp01(dir === "up" ? (value - start) / (target - start) : (start - value) / (start - target));
}

/**
 * Posición en el año (0 = 1-ene, 1 = fin de Q1 … 4 = 31-dic). Antes de que empiece el año → 0;
 * después → 4.
 */
export function yearPosition(today: Date, year = OKR_YEAR): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (t <= start) return 0;
  if (t >= end) return 4;
  // Trimestres por meses naturales (no por días) para que los cortes caigan en fin de mes.
  const month = today.getUTCMonth();
  const qStart = Math.floor(month / 3) * 3;
  const qs = Date.UTC(year, qStart, 1);
  const qe = Date.UTC(year, qStart + 3, 1);
  return Math.floor(month / 3) + (t - qs) / (qe - qs);
}

/** Valor que tocaría llevar en la posición `pos` del año (interpolando entre metas trimestrales). */
function expectedValue(item: OkrItem, pos: number): number | null {
  const start = startOf(item);
  if (start == null || item.target == null) return null;
  if (item.unit === "bool") {
    // Un hito se cumple o no: no se "interpola". Se espera completo al cierre del trimestre fijado.
    const due = item.targets.findIndex((t) => t != null && t >= 1);
    return due >= 0 && pos >= due + 1 ? item.target : start;
  }
  const pts: [number, number][] = [[0, start]];
  item.targets.forEach((t, i) => t != null && pts.push([i + 1, t]));
  if (pos <= 0) return start;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (pos <= x1) return y0 + ((y1 - y0) * (pos - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function statusOf(progress: number | null, expected: number | null): OkrStatus {
  if (progress == null) return "none";
  if (progress >= 0.995) return "done";
  const exp = expected ?? 0;
  if (exp < 0.02) return "pending";
  if (progress >= exp * 0.9) return "on_track";
  if (progress >= exp * 0.6) return "at_risk";
  return "off_track";
}

/** Construye el árbol con avance, ritmo, estado y proyectos agregados. */
export function buildOkrTree(
  items: OkrItem[],
  projects: OkrProject[],
  today: Date,
  year = OKR_YEAR,
): OkrNode[] {
  const pos = yearPosition(today, year);
  const projById = new Map(projects.map((p) => [p.id, p]));
  const kids = new Map<string | null, OkrItem[]>();
  for (const it of items) {
    const list = kids.get(it.parentId) ?? [];
    list.push(it);
    kids.set(it.parentId, list);
  }
  const byPos = (a: OkrItem, b: OkrItem) => a.position - b.position;

  function build(item: OkrItem): OkrNode {
    const children = (kids.get(item.id) ?? []).sort(byPos).map(build);
    const start = startOf(item);
    const last = latestActual(item);
    const hasOwn = start != null && item.target != null;
    const value = last ? last.value : item.baseline;

    const ownProgress = hasOwn && value != null ? fraction(value, start!, item.target!, item.direction) : null;
    const exp = hasOwn ? expectedValue(item, pos) : null;
    const ownExpected = exp != null ? fraction(exp, start!, item.target!, item.direction) : null;

    const childProgress = children.map((c) => c.progress).filter((x): x is number => x != null);
    const childExpected = children.map((c) => c.expected).filter((x): x is number => x != null);

    // Con datos reales, manda la métrica propia; sin ellos y con hijos medibles, la media de los hijos.
    const useOwn = hasOwn && (last != null || childProgress.length === 0);
    const progress = useOwn ? ownProgress : (mean(childProgress) ?? ownProgress);
    const expected = useOwn ? ownExpected : (mean(childExpected) ?? ownExpected);

    const seen = new Set<string>();
    const own = item.projectIds.map((id) => projById.get(id)).filter((p): p is OkrProject => !!p);
    const all: OkrProject[] = [];
    for (const p of [...own, ...children.flatMap((c) => c.projects)]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        all.push(p);
      }
    }

    return {
      item,
      children,
      progress,
      expected,
      status: statusOf(progress, expected),
      value,
      valueQuarter: last ? last.quarter : null,
      projects: all,
      blocked: all.filter((p) => p.health === "blocked").length,
      atRisk: all.filter((p) => p.health === "at_risk").length,
    };
  }

  return (kids.get(null) ?? []).filter((i) => i.year === year).sort(byPos).map(build);
}

/** Aplana el árbol en orden de lectura. */
export function flattenTree(nodes: OkrNode[]): OkrNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

/** Ruta desde el objetivo hasta el nodo `id` (ambos incluidos), para ver cómo sube el avance. */
export function pathTo(nodes: OkrNode[], id: string): OkrNode[] {
  for (const n of nodes) {
    if (n.item.id === id) return [n];
    const sub = pathTo(n.children, id);
    if (sub.length) return [n, ...sub];
  }
  return [];
}

/** Formatea un valor según la unidad. */
export function fmtValue(v: number | null, unit: OkrUnit): string {
  if (v == null) return "—";
  const r = Math.round(v * 100) / 100;
  switch (unit) {
    case "eur_m":
      return `€${r}M`;
    case "pct":
      return `${r}%`;
    case "bool":
      return v >= 1 ? "Sí" : "No";
    case "weeks":
      return `${r} sem`;
    case "per_week":
      return `${r}/sem`;
    default:
      return String(r);
  }
}

export const QUARTER_LABEL = ["Q1", "Q2", "Q3", "Q4"] as const;

/** Trimestre en curso del año OKR (0–3), o null si el año no ha empezado / ya acabó. */
export function currentQuarter(today: Date, year = OKR_YEAR): number | null {
  if (today.getUTCFullYear() !== year) return null;
  return Math.floor(today.getUTCMonth() / 3);
}
