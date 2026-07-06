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
   * comes from `status_6` (the last active status before it died) — null means
   * it died before reaching even "Contacted".
   */
  lastPipelineStage: PipelineStatus | null;
  channel: Channel;
}
