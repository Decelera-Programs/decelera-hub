import type { HardKpiKey, HddEvent, SoftKpiKey, TeamKpiKey } from "@/lib/hdd/types";

export const SOFT_KEYS: SoftKpiKey[] = [
  "leadership", "integrity", "self_confidence", "cool_head", "unconventional_thinking",
  "doer", "resilience", "ambition_purpose", "openness_coachability",
];
export const SOFT_LABEL: Record<SoftKpiKey, string> = {
  leadership: "Leadership",
  integrity: "Integrity",
  self_confidence: "Self Confidence",
  cool_head: "Cool Head",
  unconventional_thinking: "Unconventional Thinking",
  doer: "Doer",
  resilience: "Resilience",
  ambition_purpose: "Ambition & Purpose",
  openness_coachability: "Openness & Coachability",
};
export const SOFT_SHORT: Record<SoftKpiKey, string> = {
  leadership: "Leadership",
  integrity: "Integrity",
  self_confidence: "Self Conf.",
  cool_head: "Cool Head",
  unconventional_thinking: "Unconv.",
  doer: "Doer",
  resilience: "Resilience",
  ambition_purpose: "Ambition",
  openness_coachability: "Openness",
};

export const HARD_KEYS: HardKpiKey[] = ["niche_experience", "tech_experience", "go_to_market_experience"];
export const HARD_LABEL: Record<HardKpiKey, string> = {
  niche_experience: "Niche",
  tech_experience: "Tech",
  go_to_market_experience: "Go to Market",
};

export const TEAM_KEYS: TeamKpiKey[] = [
  "trust_conflict_resolution", "clear_operational_roles", "complementary_personality", "vision_alignment",
];
export const TEAM_LABEL: Record<TeamKpiKey, string> = {
  trust_conflict_resolution: "Trust & Conflict Resolution",
  clear_operational_roles: "Clear Operational Roles",
  complementary_personality: "Complementary Personality",
  vision_alignment: "Vision Alignment",
};

export const EVENTS: HddEvent[] = ["Workstations", "Cooking Contest", "Decelera Games"];
export const EVENT_SHORT: Record<HddEvent, string> = {
  Workstations: "Workstations",
  "Cooking Contest": "Cooking",
  "Decelera Games": "Games",
};

/** Formatea un número; nunca devuelve NaN. */
export function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(".", ",");
}

export function pct(part: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

export function mean(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
