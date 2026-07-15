import type { Channel, Deal, FormScore, PipelineStatus, RawDeal, StatusValue, WeekBucket } from "./types";

/** Parses Postgres text-array literals like `{Other}` or `{"Contacted by LinkedIn"}` into string arrays. */
export function parsePgArray(raw: string | null): string[] {
  if (!raw) return [];
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "");
  if (!inner) return [];
  const matches = inner.match(/"([^"]*)"|[^,]+/g) ?? [];
  return matches.map((m) => m.replace(/^"|"$/g, "").trim()).filter(Boolean);
}

export const REFERENCE_CHANNEL_MAP: Record<string, Channel> = {
  "Contacted by LinkedIn": "Outreach",
  Outbound: "Outreach",
  Event: "Outreach",
  "Decelera Team": "Outreach",
  "Mail from Decelera Team": "Outreach",
  Maru: "Outreach",
  Referral: "Referral",
  Investor: "Referral",
  Portfolio: "Referral",
  Alumni: "Referral",
  EM: "Referral",
  "Social media (LinkedIn, X, Instagram...)": "Marketing",
  Press: "Marketing",
  Google: "Marketing",
  "Decelera Newsletter": "Marketing",
  Inbound: "Marketing",
  Other: "Otros",
};

export function categorizeReference(reference: string | null): Channel {
  if (!reference) return "Otros";
  return REFERENCE_CHANNEL_MAP[reference] ?? "Otros";
}

/** Groups the raw Attio source labels by the channel they roll up into, for display in a legend. */
export function buildChannelSources(): Record<Channel, string[]> {
  const grouped: Record<Channel, string[]> = { Marketing: [], Referral: [], Outreach: [], Otros: [] };
  for (const [source, channel] of Object.entries(REFERENCE_CHANNEL_MAP)) {
    grouped[channel].push(source);
  }
  grouped.Otros.push("Sin fuente / no mapeada");
  return grouped;
}

export const PIPELINE_ORDER: PipelineStatus[] = [
  "Contacted",
  "Qualified",
  "In play",
  "Pre-committee",
  "Invested",
];

const DEAD_STATUSES: StatusValue[] = ["Killed", "Not qualified"];

function asStatus(value: string | null): StatusValue | null {
  if (!value) return null;
  const all: StatusValue[] = [...PIPELINE_ORDER, ...DEAD_STATUSES];
  return all.includes(value as StatusValue) ? (value as StatusValue) : null;
}

function asPipelineStatus(value: string | null): PipelineStatus | null {
  if (!value) return null;
  return (PIPELINE_ORDER as string[]).includes(value) ? (value as PipelineStatus) : null;
}

/** First Monday of the Mexico 2026 opencall — the "Semana 1" boundary. */
export const OPEN_CALL_START = Date.UTC(2026, 5, 29);
/** Deadline to hit the applications goal (`CHANNEL_GOALS.TOTAL`) — falls in Semana 12. */
export const APPLICATIONS_DEADLINE = Date.UTC(2026, 8, 15);
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Buckets a date into "Pre-opencall" or a 1-indexed week since `OPEN_CALL_START`. */
export function computeWeek(date: Date | null): WeekBucket {
  if (!date) return { weekIndex: null, weekLabel: "Sin fecha" };
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (day < OPEN_CALL_START) return { weekIndex: -1, weekLabel: "Pre-opencall" };
  const weekIndex = Math.floor((day - OPEN_CALL_START) / (7 * MS_PER_DAY)) + 1;
  return { weekIndex, weekLabel: `Semana ${weekIndex}` };
}

/** Max points per dimension in `form_sumary` (Team/35, Market/10, Product/20, Traction/20, Total/85). */
export const FORM_DIMENSION_MAX = { team: 35, market: 10, product: 20, traction: 20, total: 85 } as const;

const EMPTY_FORM_SCORE: FormScore = {
  team: null,
  market: null,
  product: null,
  traction: null,
  total: null,
  tier: null,
};

/** Parses the fixed-format `form_sumary` block (see `FORM_DIMENSION_MAX` for the scale). */
export function parseFormSummary(raw: string | null): FormScore {
  if (!raw) return EMPTY_FORM_SCORE;

  const grab = (label: string) => {
    const match = raw.match(new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)\\s*/`, "i"));
    return match ? Number(match[1]) : null;
  };
  const tierMatch = raw.match(/Tier:\s*(.+)/i);

  return {
    team: grab("Team"),
    market: grab("Market"),
    product: grab("Product"),
    traction: grab("Traction"),
    total: grab("Total"),
    tier: tierMatch ? tierMatch[1].trim() : null,
  };
}

/** Splits a `🟢 flag one\n🟢 flag two` block into plain-text flags. */
export function parseFlagList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.replace(/^\p{Extended_Pictographic}\s*/u, "").trim())
    .filter(Boolean);
}

export function mapRawDeal(raw: RawDeal): Deal {
  const status = asStatus(raw.status);
  const isDead = status ? DEAD_STATUSES.includes(status) : false;
  const lastPipelineStage = isDead ? asPipelineStatus(raw.status_6) : asPipelineStatus(raw.status);
  const referenceList = parsePgArray(raw.reference_3);
  const createdAtRaw = raw.created_at_entry ?? raw.created_at_record;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
  const { weekIndex, weekLabel } = computeWeek(createdAt);
  const name = raw.name ?? "Sin nombre";
  const sourceLabel = referenceList[0] ?? null;

  return {
    recordId: raw.record_id,
    name,
    stage: raw.stage as Deal["stage"],
    status,
    lastPipelineStage,
    channel: categorizeReference(sourceLabel),
    sourceLabel,
    createdAt,
    weekIndex,
    weekLabel,
    formScore: parseFormSummary(raw.form_sumary),
    greenFlags: parseFlagList(raw.green_flags_form),
  };
}
