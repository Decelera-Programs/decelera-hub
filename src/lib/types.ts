export type StageValue = "Mexico 2026" | "Leads Mexico 2026";

/** Live pipeline progression, in order. */
export type PipelineStatus = "Contacted" | "Qualified" | "In play" | "Pre-committee" | "Invested";

/** Terminal states — a deal here is dead, not "further along" than the pipeline. */
export type DeadStatus = "Killed" | "Not qualified";

export type StatusValue = PipelineStatus | DeadStatus;

export type Channel = "Marketing" | "Referral" | "Outreach" | "Otros";

export interface RawDeal {
  record_id: string;
  name: string | null;
  stage: string | null;
  status: string | null;
  status_6: string | null;
  reference_3: string | null;
  created_at_entry: string | null;
  created_at_record: string | null;
  form_sumary: string | null;
  green_flags_form: string | null;
  tier_5: string | null;
  owner: string | null;
}

/** -1 = antes del inicio de la opencall, 1/2/3… = semana N desde el inicio, null = sin fecha. */
export type WeekBucket = { weekIndex: number | null; weekLabel: string };

/** Parsed from `form_sumary` (e.g. "Team: 17 / 35\nMarket: 3 / 10\n..."). Null fields = no form yet. */
export interface FormScore {
  team: number | null;
  market: number | null;
  product: number | null;
  traction: number | null;
  total: number | null;
  tier: string | null;
}

export interface Deal {
  recordId: string;
  name: string;
  stage: StageValue;
  /** Current status as tracked in Attio. Null if never set. */
  status: StatusValue | null;
  /**
   * Furthest live pipeline stage this deal ever reached.
   * For live deals this mirrors `status`. For Killed/Not qualified deals this
   * comes from `status_6` (the last active status before it died), falling
   * back to "Contacted" when that's missing — every deal here applied, so it
   * was contacted at minimum even if Attio never recorded where it died.
   */
  lastPipelineStage: PipelineStatus | null;
  channel: Channel;
  /** Raw first value of `reference_3` (e.g. "Event", "Contacted by LinkedIn") — null if missing/unmapped. */
  sourceLabel: string | null;
  createdAt: Date | null;
  weekIndex: number | null;
  weekLabel: string;
  formScore: FormScore;
  greenFlags: string[];
  /** Attio deal owner (workspace member name) — null if unassigned. */
  owner: string | null;
}
