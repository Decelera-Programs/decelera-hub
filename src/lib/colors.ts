import type { Channel } from "./types";

export const CHANNEL_ORDER: Channel[] = ["Marketing", "Referral", "Outreach", "Otros"];

export const CHANNEL_COLOR: Record<Channel, string> = {
  Marketing: "var(--series-1)",
  Referral: "var(--series-2)",
  Outreach: "var(--series-3)",
  Otros: "var(--series-other)",
};

/** Per-row color, keyed by `ConversionRowDef.key` (see CONVERSION_ROWS in aggregate.ts) — one slot per row of the conversion table. */
export const ROW_COLOR: Record<string, string> = {
  Referrals: "var(--row-1)",
  LinkedIn: "var(--row-2)",
  Events: "var(--row-3)",
  Boardy: "var(--row-4)",
  OutboundEmailing: "var(--row-5)",
  Maru: "var(--row-6)",
  Inbound: "var(--row-7)",
  Unclassified: "var(--row-8)",
};
