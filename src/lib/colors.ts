import type { Channel } from "./types";

export const CHANNEL_ORDER: Channel[] = ["Marketing", "Referral", "Outreach", "Otros"];

export const CHANNEL_COLOR: Record<Channel, string> = {
  Marketing: "var(--series-1)",
  Referral: "var(--series-2)",
  Outreach: "var(--series-3)",
  Otros: "var(--series-other)",
};
