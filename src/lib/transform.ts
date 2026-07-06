import type { Channel, Deal, PipelineStatus, RawDeal, StatusValue } from "./types";

/** Parses Postgres text-array literals like `{Other}` or `{"Contacted by LinkedIn"}` into string arrays. */
export function parsePgArray(raw: string | null): string[] {
  if (!raw) return [];
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "");
  if (!inner) return [];
  const matches = inner.match(/"([^"]*)"|[^,]+/g) ?? [];
  return matches.map((m) => m.replace(/^"|"$/g, "").trim()).filter(Boolean);
}

const REFERENCE_CHANNEL_MAP: Record<string, Channel> = {
  "Contacted by LinkedIn": "Outreach",
  Outbound: "Outreach",
  Event: "Outreach",
  "Decelera Team": "Outreach",
  "Mail from Decelera Team": "Outreach",
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

export function mapRawDeal(raw: RawDeal): Deal {
  const status = asStatus(raw.status);
  const isDead = status ? DEAD_STATUSES.includes(status) : false;
  const lastPipelineStage = isDead ? asPipelineStatus(raw.status_6) : asPipelineStatus(raw.status);
  const referenceList = parsePgArray(raw.reference_3);

  return {
    recordId: raw.record_id,
    name: raw.name ?? "Sin nombre",
    stage: raw.stage as Deal["stage"],
    status,
    lastPipelineStage,
    channel: categorizeReference(referenceList[0] ?? null),
  };
}
