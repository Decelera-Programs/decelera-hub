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
  referral: string | null;
  /** Attio "Reconect reason" — set (e.g. "Not fund raising", "Too early") when a live deal is parked to revisit later rather than actively worked. */
  reconect: string | null;
  /** Attio "Killed reason" — set (e.g. "Did not answer", "Not interested") when `status` is "Killed". */
  reason: string | null;
  /** Attio "Contact Status" — e.g. "Videocall Scheduled", "Videocall Done", "No Response". */
  contact_status: string | null;
  /**
   * Attio "Program" — "Potential Program" or "Inversión Pre-Program". Set once program
   * participation is actually confirmed, distinct from the pipeline `status` reaching "Invested".
   */
  program: string | null;
  /**
   * Attio "Tier 1 - OK" — multiselect of team members who flagged this deal Tier 1 via signals.
   * Typed loosely: a multiselect field may come back from Supabase as a genuine array rather
   * than delimited text, and `transform.ts`'s `asText` handles either shape safely.
   */
  tier_1_ok: string | string[] | null;
  /**
   * Attio "Problem" — el primer campo largo del formulario de aplicación. Se usa solo como señal
   * de "rellenó el formulario" (ver `Deal.hasApplicationForm`): cubre el 100% de los deals que
   * tienen algún campo crudo del form, y a diferencia de `form_sumary`/`form_score` (que los
   * genera el equipo al revisar) está desde que el founder envía la aplicación.
   */
  problem: string | null;
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
  /** Free-text "reference explanation" (Attio `referral`) — used to tell a real startups@decelera.com inbound apart from a bare/misfiled "Inbound" tag. */
  referralNote: string | null;
  createdAt: Date | null;
  weekIndex: number | null;
  weekLabel: string;
  formScore: FormScore;
  greenFlags: string[];
  /** Attio deal owner (workspace member name) — null if unassigned. */
  owner: string | null;
  /** Attio "Reconect reason" — set when a live deal is parked to revisit later, not actively worked. */
  reconnectReason: string | null;
  /** Attio "Killed reason" — set when `status` is "Killed" (e.g. "Did not answer", "Not interested"). */
  killedReason: string | null;
  /** Attio "Contact Status" — e.g. "Videocall Scheduled", "Videocall Done", "No Response". Null if never set. */
  contactStatus: string | null;
  /** Attio "Program" — set once program participation is actually confirmed ("Inversión Pre-Program"), distinct from the pipeline status reaching "Invested". Null if unset. */
  programStatus: string | null;
  /**
   * True si un analista marcó el deal Tier 1 vía señales (Attio "Tier 1 - OK"), aparte del tier
   * del formulario. Actualmente NO se usa: "Tier 1" = `formScore.tier === "Tier 1"` y nada más
   * (decisión de Carlos, sept 2026). Se mantiene sincronizado por si se reactiva.
   */
  tier1SignalOk: boolean;
  /**
   * True si el founder envió el formulario de aplicación (campo `problem` presente). Señal real de
   * "aplicó", independiente de `stage` (un aplicante vía Maru queda en `stage="Leads Mexico 2026"`)
   * y de `formScore`/`form_sumary` (resumen que genera el equipo al revisar, no siempre existe).
   */
  hasApplicationForm: boolean;
}
