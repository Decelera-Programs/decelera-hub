import { APPLICATIONS_DEADLINE, MS_PER_DAY, OPEN_CALL_START, PIPELINE_ORDER } from "./transform";
import type { Channel, Deal, PipelineStatus } from "./types";

export type CurationGroup = "Curated" | "Mass" | "Inbound";

export interface ConversionRowDef {
  key: string;
  label: string;
  /** Which categorical channel color/dot this row borrows for visual continuity with the rest of the dashboard. */
  channel: Channel;
  /** null = not confidently classifiable (goes in "Sin clasificar"). */
  group: CurationGroup | null;
  match: (deal: Deal) => boolean;
}

/**
 * Row split for the conversion table: 3 direccional channels (Curated = personal/manual touch,
 * Mass = automated bulk outreach, Inbound = they came to us) with named subchannels under
 * Curated/Mass. Inbound and "Sin clasificar" stay as single rows — Attio's `reference_3` picklist
 * doesn't currently distinguish Newsletter/LinkedIn/Instagram/Web within inbound (they're all one
 * "Social media (LinkedIn, X, Instagram...)" value, or a generic "Inbound"/"Google"), so a literal
 * per-platform split isn't possible yet. Click-to-expand on those rows still shows whatever raw
 * `reference_3` values exist underneath, via the generic source-breakdown below.
 */
export const CONVERSION_ROWS: ConversionRowDef[] = [
  { key: "Referrals", label: "Referrals", channel: "Referral", group: "Curated", match: (d) => d.channel === "Referral" },
  {
    key: "LinkedIn",
    label: "LinkedIn",
    channel: "Outreach",
    group: "Curated",
    match: (d) => d.sourceLabel === "Contacted by LinkedIn" || d.sourceLabel === "Decelera Team",
  },
  {
    key: "Events",
    label: "Events",
    channel: "Outreach",
    group: "Curated",
    match: (d) => d.sourceLabel === "Event",
  },
  {
    key: "OutboundEmailing",
    label: "Outbound emailing",
    channel: "Outreach",
    group: "Mass",
    match: (d) => d.sourceLabel === "Outbound" || d.sourceLabel === "Mail from Decelera Team",
  },
  {
    key: "Maru",
    label: "Maru",
    channel: "Outreach",
    group: "Mass",
    match: (d) => d.sourceLabel === "Maru",
  },
  { key: "Inbound", label: "Inbound", channel: "Marketing", group: "Inbound", match: (d) => d.channel === "Marketing" },
  { key: "Unclassified", label: "Sin clasificar", channel: "Otros", group: null, match: (d) => d.channel === "Otros" },
];

/**
 * Objetivos de la hoja de metas que compartió Carlos (columna "Mex '26 Applications"),
 * remapeados a las claves nuevas (Referral→Referrals, Outreach-Curado→LinkedIn,
 * Outreach-Event→Events, Outreach-MassMailing→OutboundEmailing, Outreach-Masivo→Maru).
 * Inbound / Sin clasificar no tenían objetivo en la hoja.
 */
export const CHANNEL_GOALS: Record<string, number> = {
  Referrals: 220,
  Events: 20,
  LinkedIn: 125,
  Maru: 556,
  OutboundEmailing: 250,
  TOTAL: 1171,
};

/** Objetivo de Tier 1 por fila — la cifra entre paréntesis junto a "Applications" en la hoja. */
export const TIER1_GOALS: Record<string, number> = {
  Referrals: 55,
  Events: 4,
  LinkedIn: 13,
  Maru: 21,
  OutboundEmailing: 3,
  TOTAL: 96,
};

/** Objetivo de "Selected" (= Invested aquí) por fila. */
export const SELECTED_GOALS: Record<string, number> = {
  Referrals: 13,
  Events: 2,
  LinkedIn: 5,
  Maru: 2,
  OutboundEmailing: 1,
  TOTAL: 23,
};

/** % benchmark de eficiencia de canal (In play ÷ Contacted) — pendiente de definir. */
export const CHANNEL_EFFICIENCY_BENCHMARK_PCT: number | null = null;

/** Below this many "Contacted", an efficiency rate is an anecdote, not a rate. */
export const MIN_SAMPLE_FOR_EFFICIENCY = 10;

export interface FunnelMatrixRow {
  key: string;
  label: string;
  channel: Channel | null;
  group: CurationGroup | null;
  /** Cumulative count of deals that ever reached each pipeline stage or beyond. */
  stageCounts: Record<PipelineStatus, number>;
  /** How many deals in this row have a "Tier 1" form score. */
  tier1: number;
  total: number;
  /** Breakdown by raw `reference_3` source — only populated when the row mixes 2+ distinct sources. */
  subRows: FunnelMatrixRow[];
  /** Target from the goals sheet — null when this row has no defined objective. */
  goal: number | null;
  tier1Goal: number | null;
  selectedGoal: number | null;
}

function rank(stage: PipelineStatus | null): number {
  return stage ? PIPELINE_ORDER.indexOf(stage) : -1;
}

function buildRow(
  key: string,
  label: string,
  channel: Channel | null,
  group: CurationGroup | null,
  deals: Deal[]
): FunnelMatrixRow {
  const stageCounts = Object.fromEntries(
    PIPELINE_ORDER.map((stage) => [
      stage,
      deals.filter((d) => rank(d.lastPipelineStage) >= rank(stage)).length,
    ])
  ) as Record<PipelineStatus, number>;

  return {
    key,
    label,
    channel,
    group,
    stageCounts,
    tier1: deals.filter((d) => d.formScore.tier === "Tier 1").length,
    total: deals.length,
    subRows: [],
    goal: CHANNEL_GOALS[key] ?? null,
    tier1Goal: TIER1_GOALS[key] ?? null,
    selectedGoal: SELECTED_GOALS[key] ?? null,
  };
}

/** Splits a row's deals by raw `sourceLabel` — only worth showing when there's more than one distinct source. */
function buildSourceSubRows(channel: Channel | null, deals: Deal[]): FunnelMatrixRow[] {
  const bySource = new Map<string, Deal[]>();
  for (const deal of deals) {
    const source = deal.sourceLabel ?? "Sin fuente";
    const group = bySource.get(source);
    if (group) group.push(deal);
    else bySource.set(source, [deal]);
  }

  if (bySource.size < 2) return [];

  return Array.from(bySource.entries())
    .map(([source, sourceDeals]) => buildRow(source, source, channel, null, sourceDeals))
    .sort((a, b) => b.total - a.total);
}

/** Funnel matrix: one row per conversion-table channel split (+ TOTAL), one column per live pipeline stage, plus Tier 1 and conversion-to-selection totals. */
export function buildFunnelMatrix(deals: Deal[]): FunnelMatrixRow[] {
  const rows = CONVERSION_ROWS.map((def) => {
    const rowDeals = deals.filter(def.match);
    const row = buildRow(def.key, def.label, def.channel, def.group, rowDeals);
    row.subRows = buildSourceSubRows(def.channel, rowDeals);
    return row;
  }).filter((row) => row.total > 0);

  rows.push(buildRow("TOTAL", "Total", null, null, deals));
  return rows;
}

export interface ApplicationsOverTimePoint {
  date: string;
  newCount: number;
  cumulative: number;
}

/** Daily new + running-total count of deals, ordered by creation date — excludes deals with no date. */
export function buildApplicationsOverTime(deals: Deal[]): ApplicationsOverTimePoint[] {
  const byDay = new Map<string, number>();
  for (const deal of deals) {
    if (!deal.createdAt) continue;
    const day = deal.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const days = Array.from(byDay.keys()).sort();
  let cumulative = 0;
  return days.map((date) => {
    const newCount = byDay.get(date)!;
    cumulative += newCount;
    return { date, newCount, cumulative };
  });
}

export interface PacePoint {
  day: number;
  cumulative: number;
}

export interface PaceVsPlan {
  /** Real cumulative line — anchored at day 0 with whatever total was already banked before the opencall started. */
  points: PacePoint[];
  /** Straight-line plan: 0 at day 0 (opencall start) to `goal` at `totalDays` (the deadline). */
  planPoints: PacePoint[];
  totalDays: number;
  todayDay: number;
  todayReal: number;
  todayPlan: number;
  /** Plan minus real at today — positive means behind pace, negative means ahead. */
  gap: number;
  /** Slope of the real line from day 0 to today (excludes whatever was already banked pre-opencall). */
  actualPacePerWeek: number;
  /** Weekly rate needed from today to close the gap by the deadline — null once the deadline has passed. */
  requiredPacePerWeek: number | null;
}

/**
 * "Ritmo contra objetivo": real cumulative applications vs. a straight-line plan running
 * from the opencall start to `APPLICATIONS_DEADLINE`, where `goal` should be reached.
 */
export function buildPaceVsPlan(deals: Deal[], goal: number): PaceVsPlan {
  const totalDays = Math.round((APPLICATIONS_DEADLINE - OPEN_CALL_START) / MS_PER_DAY);

  const withDay = buildApplicationsOverTime(deals).map((p) => ({
    day: Math.round((new Date(`${p.date}T00:00:00Z`).getTime() - OPEN_CALL_START) / MS_PER_DAY),
    cumulative: p.cumulative,
  }));

  const before = withDay.filter((p) => p.day <= 0);
  const anchor = before.length > 0 ? before[before.length - 1].cumulative : 0;
  const after = withDay.filter((p) => p.day > 0);
  const points: PacePoint[] = [{ day: 0, cumulative: anchor }, ...after];

  const planPoints: PacePoint[] = [
    { day: 0, cumulative: 0 },
    { day: totalDays, cumulative: goal },
  ];

  const todayDay = Math.min(Math.max(Math.round((Date.now() - OPEN_CALL_START) / MS_PER_DAY), 0), totalDays);
  const upToToday = points.filter((p) => p.day <= todayDay);
  const todayReal = upToToday.length > 0 ? upToToday[upToToday.length - 1].cumulative : anchor;
  const todayPlan = totalDays > 0 ? (goal * todayDay) / totalDays : goal;
  const gap = todayPlan - todayReal;

  const weeksElapsed = todayDay / 7;
  const weeksRemaining = (totalDays - todayDay) / 7;
  const actualPacePerWeek = weeksElapsed > 0 ? (todayReal - anchor) / weeksElapsed : 0;
  const requiredPacePerWeek = weeksRemaining > 0 ? (goal - todayReal) / weeksRemaining : null;

  return { points, planPoints, totalDays, todayDay, todayReal, todayPlan, gap, actualPacePerWeek, requiredPacePerWeek };
}

export interface AbsoluteFunnelStage {
  key: string;
  label: string;
  count: number;
  /** % lost vs. the very first stage (Aplicaciones) — not vs. the row above. Null on the first row. */
  dropPct: number | null;
}

export interface AbsoluteFunnel {
  stages: AbsoluteFunnelStage[];
  total: number;
  selectedGoal: number;
}

const ABSOLUTE_FUNNEL_STAGES: { key: PipelineStatus; label: string }[] = [
  { key: "Qualified", label: "Cualificadas" },
  { key: "In play", label: "In play" },
  { key: "Pre-committee", label: "Pre-comité" },
  { key: "Invested", label: "Seleccionada" },
];

/**
 * "Funnel — supervivencia absoluta": each stage counted against the original total (not the
 * stage before it), so a brutal drop stays visible instead of being hidden by re-normalizing
 * every bar to 100% of its predecessor. Counts are cumulative — a deal that reached "In play"
 * and later got killed still counts there (via `lastPipelineStage`, sourced from `status_6`).
 */
export function buildAbsoluteFunnel(deals: Deal[]): AbsoluteFunnel {
  const total = deals.length;

  const stages: AbsoluteFunnelStage[] = [
    { key: "Aplicaciones", label: "Aplicaciones", count: total, dropPct: null },
    ...ABSOLUTE_FUNNEL_STAGES.map(({ key, label }) => {
      const count = deals.filter((d) => rank(d.lastPipelineStage) >= rank(key)).length;
      const dropPct = total > 0 ? Math.round((1 - count / total) * 100) : null;
      return { key, label, count, dropPct };
    }),
  ];

  return { stages, total, selectedGoal: SELECTED_GOALS.TOTAL };
}

export type WeeklyVolumePoint = { weekLabel: string; weekIndex: number } & Record<Channel, number>;

/** Deals created per week bucket, split by channel — excludes deals with no created-at date. */
export function buildWeeklyVolume(deals: Deal[]): WeeklyVolumePoint[] {
  const byWeek = new Map<number, WeeklyVolumePoint>();
  for (const deal of deals) {
    if (deal.weekIndex === null) continue;
    let point = byWeek.get(deal.weekIndex);
    if (!point) {
      point = {
        weekLabel: deal.weekLabel,
        weekIndex: deal.weekIndex,
        Marketing: 0,
        Referral: 0,
        Outreach: 0,
        Otros: 0,
      };
      byWeek.set(deal.weekIndex, point);
    }
    point[deal.channel] += 1;
  }
  return Array.from(byWeek.values()).sort((a, b) => a.weekIndex - b.weekIndex);
}

