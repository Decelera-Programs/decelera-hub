import { CHANNEL_ORDER } from "./colors";
import { PIPELINE_ORDER } from "./transform";
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

export interface FunnelShapePoint {
  stage: PipelineStatus;
  count: number;
}

/** Overall cumulative funnel shape (all channels combined) — same numbers as the TOTAL row. */
export function buildFunnelShape(deals: Deal[]): FunnelShapePoint[] {
  const totalRow = buildRow("TOTAL", deals);
  return PIPELINE_ORDER.map((stage) => ({ stage, count: totalRow.stageCounts[stage] }));
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
