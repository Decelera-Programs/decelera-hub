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
/**
 * A deal tagged `reference_3 = "Inbound"` only counts as a real startups@decelera.com lead when
 * its reference explanation says so. Otherwise (empty, or some unrelated note) it's folded into
 * "Social media" instead — see `effectiveSourceLabel`.
 */
function isMisfiledInboundTag(d: Deal): boolean {
  return d.sourceLabel === "Inbound" && !d.referralNote?.toLowerCase().includes("startups@decelera");
}

/**
 * A deal tagged `reference_3 = "Mail from Decelera Team"` with a reference explanation naming a
 * real person is a referral that got tagged with the wrong picklist value, not a genuine mass
 * email — a real automated mail has no such note.
 */
function isMisfiledMailFromTeamTag(d: Deal): boolean {
  return d.sourceLabel === "Mail from Decelera Team" && !!d.referralNote;
}

export const CONVERSION_ROWS: ConversionRowDef[] = [
  {
    key: "Referrals",
    label: "Referrals",
    channel: "Referral",
    group: "Curated",
    match: (d) => (d.channel === "Referral" && d.sourceLabel !== "Boardy") || isMisfiledMailFromTeamTag(d),
  },
  {
    key: "LinkedIn",
    label: "LinkedIn",
    channel: "Outreach",
    group: "Curated",
    match: (d) => d.sourceLabel === "Contacted by LinkedIn" || d.sourceLabel === "Decelera Team" || d.sourceLabel === "Outbound",
  },
  {
    key: "Events",
    label: "Events",
    channel: "Outreach",
    group: "Curated",
    match: (d) => d.sourceLabel === "Event",
  },
  {
    key: "Boardy",
    label: "Boardy",
    channel: "Referral",
    group: "Curated",
    match: (d) => d.sourceLabel === "Boardy",
  },
  {
    key: "OutboundEmailing",
    label: "Outbound emailing",
    channel: "Outreach",
    group: "Mass",
    match: (d) => d.sourceLabel === "Mail from Decelera Team" && !isMisfiledMailFromTeamTag(d),
  },
  {
    key: "Maru",
    label: "Maru",
    channel: "Outreach",
    group: "Mass",
    match: (d) => d.sourceLabel === "Maru",
  },
  {
    key: "Inbound",
    label: "Inbound",
    channel: "Marketing",
    group: "Inbound",
    match: (d) => d.channel === "Marketing",
  },
  { key: "Unclassified", label: "Other", channel: "Otros", group: null, match: (d) => d.channel === "Otros" },
];

/** Row keys in table order — drives the stacking/legend order of the weekly volume chart. */
export const ROW_ORDER: string[] = CONVERSION_ROWS.map((def) => def.key);

/** Row key → display label (e.g. "OutboundEmailing" → "Outbound emailing"). */
export const ROW_LABEL: Record<string, string> = Object.fromEntries(
  CONVERSION_ROWS.map((def) => [def.key, def.label])
);

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
  /** How this row's deals split before ever reaching "Qualified" — same shape as the "Aplicaciones" breakdown, scoped to this row. */
  applicationsBreakdown: ApplicationsBreakdown;
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
    applicationsBreakdown: buildApplicationsBreakdown(deals),
  };
}

/** Raw `reference_3` source values that need a friendlier display label than the Attio picklist text. */
const SOURCE_LABEL_OVERRIDES: Record<string, string> = {
  Inbound: "startups@decelera",
};

/** A misfiled "Inbound" tag (no startups@decelera.com confirmation) is folded into Social media instead. */
function effectiveSourceLabel(deal: Deal): string {
  if (isMisfiledInboundTag(deal)) return "Social media (LinkedIn, X, Instagram...)";
  return deal.sourceLabel ?? "Sin fuente";
}

function groupBySourceLabel(deals: Deal[]): Map<string, Deal[]> {
  const bySource = new Map<string, Deal[]>();
  for (const deal of deals) {
    const source = effectiveSourceLabel(deal);
    const sourceDeals = bySource.get(source);
    if (sourceDeals) sourceDeals.push(deal);
    else bySource.set(source, [deal]);
  }
  return bySource;
}

/** One row per distinct raw `sourceLabel`, always — used where the group's own name is never a real source (Inbound/Other). */
function buildSourceRows(channel: Channel | null, group: CurationGroup | null, deals: Deal[]): FunnelMatrixRow[] {
  return Array.from(groupBySourceLabel(deals).entries())
    .map(([source, sourceDeals]) =>
      buildRow(source, SOURCE_LABEL_OVERRIDES[source] ?? source, channel, group, sourceDeals)
    )
    .sort((a, b) => b.total - a.total);
}

/** Splits a row's deals by raw `sourceLabel` — only worth showing when there's more than one distinct source. */
function buildSourceSubRows(channel: Channel | null, group: CurationGroup | null, deals: Deal[]): FunnelMatrixRow[] {
  if (groupBySourceLabel(deals).size < 2) return [];
  return buildSourceRows(channel, group, deals);
}

/** Funnel matrix: one row per conversion-table channel split (+ TOTAL), one column per live pipeline stage, plus Tier 1 and conversion-to-selection totals. */
export function buildFunnelMatrix(deals: Deal[]): FunnelMatrixRow[] {
  const rows = CONVERSION_ROWS.flatMap((def) => {
    const rowDeals = deals.filter(def.match);
    if (rowDeals.length === 0) return [];

    if (def.key === "Inbound" || def.key === "Unclassified") {
      // These are a bucket name, not a real source — always show the actual source(s), even if
      // there's only one, so the generic "Inbound"/"Other" label never appears in the table.
      return buildSourceRows(def.channel, def.group, rowDeals);
    }

    const row = buildRow(def.key, def.label, def.channel, def.group, rowDeals);
    row.subRows = buildSourceSubRows(def.channel, null, rowDeals);
    return [row];
  });

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
  // Extend the real line flat through to today — otherwise it stops at the last day with new
  // applications, leaving a visible gap before the "hoy" marker whenever that isn't today.
  if (points[points.length - 1].day < todayDay) {
    points.push({ day: todayDay, cumulative: todayReal });
  }
  const todayPlan = totalDays > 0 ? (goal * todayDay) / totalDays : goal;
  const gap = todayPlan - todayReal;

  const weeksElapsed = todayDay / 7;
  const weeksRemaining = (totalDays - todayDay) / 7;
  const actualPacePerWeek = weeksElapsed > 0 ? (todayReal - anchor) / weeksElapsed : 0;
  const requiredPacePerWeek = weeksRemaining > 0 ? (goal - todayReal) / weeksRemaining : null;

  return { points, planPoints, totalDays, todayDay, todayReal, todayPlan, gap, actualPacePerWeek, requiredPacePerWeek };
}

/** How a stage's cumulative count breaks down — always sums back to `count`. Null on the first row (no gate to break down). */
export interface AbsoluteFunnelBreakdown {
  /** Live deals currently sitting at exactly this status, not parked for reconnect (Attio's own "In play" / etc. view). */
  currentlyHere: number;
  /** Live deals at exactly this status with a "Reconect reason" set — parked to revisit later, not actively worked. */
  toReconnect: number;
  /** Live deals that moved on to a later stage. */
  advancedFurther: number;
  /** Killed / Not qualified deals whose last active stage (before dying) was this one or beyond. */
  diedAfterReaching: number;
}

/** How the base applicant pool splits: progressed into the pipeline, or never got past screening — and if so, why. Always sums back to the total. */
export interface ApplicationsBreakdown {
  /** Reached "Qualified" or beyond at some point (even if later killed). */
  progressed: number;
  /** Killed before reaching "Qualified", reason "Did not answer" — never responded. */
  killedDidNotAnswer: number;
  /** Killed before reaching "Qualified", reason "Not interested" — responded, declined. */
  killedNotInterested: number;
  /** Killed before reaching "Qualified" for any other/unrecorded reason. */
  killedOtherReason: number;
  /** "Not qualified" before reaching "Qualified" (distinct dead status from Killed). */
  notQualified: number;
  /** Still at "Contacted", no outcome recorded yet. */
  pending: number;
}

export interface AbsoluteFunnelStage {
  key: string;
  label: string;
  count: number;
  /** Plain-English explanation of what counts toward this stage, shown on hover above the numeric breakdown. */
  description: string;
  breakdown: AbsoluteFunnelBreakdown | null;
  /** Set on "Leads Contacted" (all deals) and "Aplicaciones" (just that subset) — how the pool splits before ever reaching "Qualified". */
  appBreakdown: ApplicationsBreakdown | null;
  /** One-off hover notes that don't fit either breakdown shape — currently just "Invested"'s programme-confirmation caveat. */
  extraLines: string[] | null;
}

export interface AbsoluteFunnel {
  stages: AbsoluteFunnelStage[];
  total: number;
  selectedGoal: number;
}

/** A lead counts as an "Aplicación" once it's a real applicant, not just outreach: either it came in through the form, or it actually got a videocall with the investment team. */
export function isApplication(d: Deal): boolean {
  // `stage` never changes after a deal is created (confirmed empirically — Maru-sourced leads
  // that later complete the form still show stage="Leads Mexico 2026" forever), so a completed
  // form has to be detected directly via the form itself, not inferred from stage.
  return d.stage === "Mexico 2026" || d.contactStatus === "Videocall Done" || d.formScore.total !== null;
}

const STAGE_DESCRIPTION: Record<string, string> = {
  "Leads Contacted": "Todos los leads que entraron al pipeline, sin importar el canal ni si llegaron a convertirse en aplicación.",
  Aplicaciones: "Companies que rellenaron el formulario o entraron a una videollamada con el equipo de inversión.",
  Qualified: "Pasaron el primer filtro de calidad del equipo tras revisar la aplicación.",
  "In play": "En proceso activo de evaluación: llamada + análisis con el equipo.",
  "Pre-committee": "Presentadas al comité de inversión para la decisión de invertir/programa/kill.",
  Invested: "Decelera invirtió y la participación en el programa está confirmada — no basta con estar marcada \"Invested\" en el pipeline.",
};

/** The value of the "Program" field that means participation is actually confirmed, not just a possibility. */
const PROGRAM_CONFIRMED_VALUE = "Inversión Pre-Program";

const ABSOLUTE_FUNNEL_STAGES: { key: PipelineStatus; label: string }[] = [
  { key: "Qualified", label: "Cualificadas" },
  { key: "In play", label: "In play" },
  { key: "Pre-committee", label: "Pre-comité" },
];

/**
 * "Funnel — supervivencia absoluta": each stage counted against the original total (not the
 * stage before it), so a brutal drop stays visible instead of being hidden by re-normalizing
 * every bar to 100% of its predecessor. Counts are cumulative — a deal that reached "In play"
 * and later got killed still counts there (via `lastPipelineStage`, sourced from `status_6`).
 */
function isLivePipelineStatus(status: Deal["status"]): status is PipelineStatus {
  return status !== null && (PIPELINE_ORDER as string[]).includes(status);
}

function isDeadDeal(d: Deal): boolean {
  return d.status === "Killed" || d.status === "Not qualified";
}

/** Decomposes a stage's cumulative count into where those deals actually stand today — always sums back to `count`. */
function buildBreakdown(deals: Deal[], stageKey: PipelineStatus): AbsoluteFunnelBreakdown {
  const stageRank = rank(stageKey);
  const liveAtStage = deals.filter((d) => d.status === stageKey);
  return {
    currentlyHere: liveAtStage.filter((d) => !d.reconnectReason).length,
    toReconnect: liveAtStage.filter((d) => !!d.reconnectReason).length,
    advancedFurther: deals.filter((d) => isLivePipelineStatus(d.status) && rank(d.status) > stageRank).length,
    diedAfterReaching: deals.filter((d) => isDeadDeal(d) && rank(d.lastPipelineStage) >= stageRank).length,
  };
}

/**
 * How the raw applicant pool splits before ever reaching "Qualified": progressed into the
 * pipeline, or died at the screening gate (Killed, broken down by reason) / Not qualified /
 * still pending. A deal that reached Qualified+ and was later killed still counts as
 * "progressed" — this is about the first gate only, not its eventual fate.
 */
function buildApplicationsBreakdown(deals: Deal[]): ApplicationsBreakdown {
  const qualifiedRank = rank("Qualified");
  const progressed = deals.filter((d) => rank(d.lastPipelineStage) >= qualifiedRank);
  const notProgressed = deals.filter((d) => rank(d.lastPipelineStage) < qualifiedRank);
  const killed = notProgressed.filter((d) => d.status === "Killed");

  return {
    progressed: progressed.length,
    killedDidNotAnswer: killed.filter((d) => d.killedReason === "Did not answer").length,
    killedNotInterested: killed.filter((d) => d.killedReason === "Not interested").length,
    killedOtherReason: killed.filter((d) => d.killedReason !== "Did not answer" && d.killedReason !== "Not interested").length,
    notQualified: notProgressed.filter((d) => d.status === "Not qualified").length,
    pending: notProgressed.filter((d) => d.status !== "Killed" && d.status !== "Not qualified").length,
  };
}

/**
 * "Leads Contacted" (every lead, whatever the source) feeds "Aplicaciones" (form fill or an
 * actual videocall — see `isApplication`), which feeds the usual pipeline stages. Qualified/In
 * play/Pre-committee/Invested are still computed over ALL deals (not just "Aplicaciones") using
 * the same pipeline-rank logic as before — a deal can be Qualified without ever having a
 * videocall logged, so those counts can occasionally exceed "Aplicaciones"; the hover breakdown
 * makes that transparent rather than hiding it behind a stricter (and less honest) filter.
 */
export function buildAbsoluteFunnel(deals: Deal[]): AbsoluteFunnel {
  const total = deals.length;
  const applications = deals.filter(isApplication);

  const stages: AbsoluteFunnelStage[] = [
    {
      key: "Leads Contacted",
      label: "Leads Contacted",
      count: total,
      description: STAGE_DESCRIPTION["Leads Contacted"],
      breakdown: null,
      appBreakdown: buildApplicationsBreakdown(deals),
      extraLines: null,
    },
    {
      key: "Aplicaciones",
      label: "Aplicaciones",
      count: applications.length,
      description: STAGE_DESCRIPTION.Aplicaciones,
      breakdown: null,
      appBreakdown: buildApplicationsBreakdown(applications),
      extraLines: null,
    },
  ];
  for (const { key, label } of ABSOLUTE_FUNNEL_STAGES) {
    const count = deals.filter((d) => rank(d.lastPipelineStage) >= rank(key)).length;
    stages.push({
      key,
      label,
      count,
      description: STAGE_DESCRIPTION[key],
      breakdown: buildBreakdown(deals, key),
      appBreakdown: null,
      extraLines: null,
    });
  }

  // "Invested" is special: the pipeline `status` reaching "Invested" isn't enough on its own —
  // it only counts here once program participation is actually confirmed (`programStatus`).
  const investedStatusCount = deals.filter((d) => d.status === "Invested").length;
  const investedConfirmedCount = deals.filter(
    (d) => d.status === "Invested" && d.programStatus === PROGRAM_CONFIRMED_VALUE
  ).length;
  stages.push({
    key: "Invested",
    label: "Contract Signed",
    count: investedConfirmedCount,
    description: STAGE_DESCRIPTION.Invested,
    breakdown: null,
    appBreakdown: null,
    extraLines: [
      `${investedStatusCount} marcadas "Invested" en el pipeline en total`,
      `${investedConfirmedCount} de ellas con programa confirmado ("${PROGRAM_CONFIRMED_VALUE}") — solo estas cuentan aquí`,
    ],
  });

  return { stages, total, selectedGoal: SELECTED_GOALS.TOTAL };
}

export interface ContactStatusCounts {
  /** `contactStatus === "Videocall Scheduled"` — call booked, hasn't happened yet. */
  videocallScheduled: number;
  /** `contactStatus === "Videocall Done"` — call happened, mid-analysis. */
  videocallDone: number;
}

/** Snapshot of where live deals stand on Attio's "Contact Status" field, independent of the main pipeline `status`. */
export function buildContactStatusCounts(deals: Deal[]): ContactStatusCounts {
  return {
    videocallScheduled: deals.filter((d) => d.contactStatus === "Videocall Scheduled").length,
    videocallDone: deals.filter((d) => d.contactStatus === "Videocall Done").length,
  };
}

export interface BestChannelResult {
  label: string;
  count: number;
}

/** Picks the CONVERSION_ROWS channel with the highest count of deals matching `extraMatch` — null when nothing matches at all. */
function bestConversionRow(deals: Deal[], extraMatch: (d: Deal) => boolean): BestChannelResult | null {
  let best: BestChannelResult | null = null;
  for (const def of CONVERSION_ROWS) {
    const count = deals.filter((d) => def.match(d) && extraMatch(d)).length;
    if (count > 0 && (!best || count > best.count)) best = { label: def.label, count };
  }
  return best;
}

/** Channel that brought in the most deals, period. */
export function buildBestChannelByVolume(deals: Deal[]): BestChannelResult | null {
  return bestConversionRow(deals, () => true);
}

/**
 * Channel that brought in the most Tier 1 companies — counting Tier 1 either from the form
 * score, or from an analyst's screening signals ("Tier 1 - OK" in Attio), whichever flagged it.
 */
export function buildBestChannelByQuality(deals: Deal[]): BestChannelResult | null {
  return bestConversionRow(deals, (d) => d.formScore.tier === "Tier 1" || d.tier1SignalOk);
}

export interface BestSourcerResult {
  name: string;
  count: number;
}

/**
 * Deal owner with the most deals — used as a stand-in for "who sourced the most deals" since
 * Attio has no separate sourcer field. Not the same thing (an owner may not be who found the
 * deal), so the UI must label this clearly.
 */
export function buildBestSourcer(deals: Deal[]): BestSourcerResult | null {
  const counts = new Map<string, number>();
  for (const d of deals) {
    if (!d.owner) continue;
    counts.set(d.owner, (counts.get(d.owner) ?? 0) + 1);
  }
  let best: BestSourcerResult | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export interface WeeklyVolumePoint {
  weekLabel: string;
  weekIndex: number;
  /** One count per `ConversionRowDef.key` in ROW_ORDER. */
  [rowKey: string]: string | number;
}

/** Deals created per week bucket, split by the same row breakdown as the conversion table — excludes deals with no created-at date. */
export function buildWeeklyVolume(deals: Deal[]): WeeklyVolumePoint[] {
  const byWeek = new Map<number, WeeklyVolumePoint>();
  for (const deal of deals) {
    if (deal.weekIndex === null) continue;
    let point = byWeek.get(deal.weekIndex);
    if (!point) {
      point = {
        weekLabel: deal.weekLabel,
        weekIndex: deal.weekIndex,
        ...Object.fromEntries(ROW_ORDER.map((key) => [key, 0])),
      };
      byWeek.set(deal.weekIndex, point);
    }
    const rowDef = CONVERSION_ROWS.find((def) => def.match(deal));
    if (rowDef) point[rowDef.key] = (point[rowDef.key] as number) + 1;
  }
  return Array.from(byWeek.values()).sort((a, b) => a.weekIndex - b.weekIndex);
}

