import { CHANNEL_ORDER } from "./colors";
import { FORM_DIMENSION_MAX, PIPELINE_ORDER } from "./transform";
import type { Channel, Deal, PipelineStatus } from "./types";

export type FunnelChannelRow = Channel | "TOTAL";

export interface FunnelMatrixRow {
  channel: FunnelChannelRow;
  /** Cumulative count of deals that ever reached each pipeline stage or beyond. */
  stageCounts: Record<PipelineStatus, number>;
  killed: number;
  notQualified: number;
  total: number;
}

function rank(stage: PipelineStatus | null): number {
  return stage ? PIPELINE_ORDER.indexOf(stage) : -1;
}

function buildRow(channel: FunnelChannelRow, deals: Deal[]): FunnelMatrixRow {
  const stageCounts = Object.fromEntries(
    PIPELINE_ORDER.map((stage) => [
      stage,
      deals.filter((d) => rank(d.lastPipelineStage) >= rank(stage)).length,
    ])
  ) as Record<PipelineStatus, number>;

  return {
    channel,
    stageCounts,
    killed: deals.filter((d) => d.status === "Killed").length,
    notQualified: deals.filter((d) => d.status === "Not qualified").length,
    total: deals.length,
  };
}

/** Funnel matrix: one row per channel (+ TOTAL), one column per live pipeline stage, plus Killed/Not qualified totals. */
export function buildFunnelMatrix(deals: Deal[]): FunnelMatrixRow[] {
  const rows = CHANNEL_ORDER.map((channel) =>
    buildRow(
      channel,
      deals.filter((d) => d.channel === channel)
    )
  ).filter((row) => row.total > 0);

  rows.push(buildRow("TOTAL", deals));
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

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface DimensionScore {
  dimension: "Team" | "Market" | "Product" | "Traction";
  avgPct: number;
  max: number;
}

export interface QualitySummary {
  /** How many of the filtered deals actually have a scored form (Leads never do). */
  sampleSize: number;
  avgTotalPct: number | null;
  dimensions: DimensionScore[];
  tierCounts: { tier: string; count: number }[];
  topGreenFlags: { flag: string; count: number; pct: number }[];
}

const DIMENSIONS: { label: DimensionScore["dimension"]; key: "team" | "market" | "product" | "traction" }[] = [
  { label: "Team", key: "team" },
  { label: "Market", key: "market" },
  { label: "Product", key: "product" },
  { label: "Traction", key: "traction" },
];

/** Form-quality summary (score breakdown + green flags) for whichever deals have a scored form. */
export function buildQualitySummary(deals: Deal[]): QualitySummary {
  const scored = deals.filter((d) => d.formScore.total !== null);
  const sampleSize = scored.length;

  const dimensions = DIMENSIONS.map(({ label, key }) => {
    const max = FORM_DIMENSION_MAX[key];
    const values = scored.map((d) => d.formScore[key]).filter((v): v is number => v !== null);
    const avgPct = values.length > 0 ? Math.round((average(values) / max) * 100) : 0;
    return { dimension: label, avgPct, max };
  });

  const totals = scored.map((d) => d.formScore.total).filter((v): v is number => v !== null);
  const avgTotalPct = totals.length > 0 ? Math.round((average(totals) / FORM_DIMENSION_MAX.total) * 100) : null;

  const tierCounts = new Map<string, number>();
  for (const deal of scored) {
    const tier = deal.formScore.tier ?? "Sin tier";
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }

  const flagCounts = new Map<string, number>();
  for (const deal of scored) {
    for (const flag of deal.greenFlags) flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
  }

  const topGreenFlags = Array.from(flagCounts.entries())
    .map(([flag, count]) => ({ flag, count, pct: sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    sampleSize,
    avgTotalPct,
    dimensions,
    tierCounts: Array.from(tierCounts.entries())
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count),
    topGreenFlags,
  };
}
