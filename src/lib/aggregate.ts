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
