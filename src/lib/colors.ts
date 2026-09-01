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
