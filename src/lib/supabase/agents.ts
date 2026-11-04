import "server-only";
import { cache } from "react";
import type { AgentEvent, AgentHealth, AgentRun, AgentRunStatus, PendingApproval } from "@/lib/agents";
import { KNOWN_AGENTS } from "@/lib/agents";
import { hubDb } from "./hub";

const RUNS_LIMIT = 80;
const EVENTS_LIMIT = 150;

type RunRow = {
  id: string;
  agent_id: string;
  pass: string | null;
  trigger: string | null;
  started_at: string;
  ended_at: string | null;
  status: AgentRunStatus;
  items_in: number | null;
  summary: string | null;
  error: string | null;
};

type EventRow = {
  id: string;
  run_id: string | null;
  agent_id: string;
  event_type: string;
  message_id: string | null;
  thread_id: string | null;
  founder: string | null;
  company: string | null;
  region: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

function rowToRun(r: RunRow): AgentRun {
  return {
    id: r.id,
    agentId: r.agent_id,
    pass: (r.pass as AgentRun["pass"]) ?? null,
    trigger: r.trigger,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    status: r.status,
    itemsIn: r.items_in ?? 0,
    summary: r.summary,
    error: r.error,
  };
}

function rowToEvent(r: EventRow): AgentEvent {
  return {
    id: r.id,
    runId: r.run_id,
    agentId: r.agent_id,
    eventType: r.event_type,
    messageId: r.message_id,
    threadId: r.thread_id,
    founder: r.founder,
    company: r.company,
    region: r.region,
    detail: r.detail ?? {},
    createdAt: r.created_at,
  };
}

export const getRecentRuns = cache(async (agentId?: string): Promise<AgentRun[]> => {
  let q = hubDb.from("agent_audit_runs").select("*").order("started_at", { ascending: false }).limit(RUNS_LIMIT);
  if (agentId) q = q.eq("agent_id", agentId);
  const { data, error } = await q;
  if (error) throw new Error(`getRecentRuns: ${error.message}`);
  return ((data ?? []) as RunRow[]).map(rowToRun);
});

export const getRecentEvents = cache(async (agentId?: string): Promise<AgentEvent[]> => {
  let q = hubDb.from("agent_audit_events").select("*").order("created_at", { ascending: false }).limit(EVENTS_LIMIT);
  if (agentId) q = q.eq("agent_id", agentId);
  const { data, error } = await q;
  if (error) throw new Error(`getRecentEvents: ${error.message}`);
  return ((data ?? []) as EventRow[]).map(rowToEvent);
});

/** Nº de eventos por `event_type` desde `sinceIso`, para anotar el diagrama de flujo y las métricas. */
export const getEventCountsSince = cache(
  async (agentId: string, sinceIso: string): Promise<Record<string, number>> => {
    const { data, error } = await hubDb
      .from("agent_audit_events")
      .select("event_type")
      .eq("agent_id", agentId)
      .gte("created_at", sinceIso);
    if (error) throw new Error(`getEventCountsSince: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { event_type: string }[]) {
      counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    }
    return counts;
  },
);

/**
 * Hilos con un `reply_drafted` sin un `approval_sent`/`approval_rejected` posterior — calculado en dos
 * lecturas + diff en memoria porque supabase-js no expone un anti-join directo; a este volumen (decenas
 * de filas, no miles) es más simple que meter una función RPC solo para esto.
 */
export const getPendingApprovals = cache(async (agentId: string): Promise<PendingApproval[]> => {
  const [{ data: drafted, error: e1 }, { data: resolved, error: e2 }] = await Promise.all([
    hubDb
      .from("agent_audit_events")
      .select("thread_id, founder, company, region, created_at")
      .eq("agent_id", agentId)
      .eq("event_type", "reply_drafted")
      .order("created_at", { ascending: false })
      .limit(50),
    hubDb
      .from("agent_audit_events")
      .select("thread_id")
      .eq("agent_id", agentId)
      .in("event_type", ["approval_sent", "approval_rejected"])
      .limit(200),
  ]);
  if (e1) throw new Error(`getPendingApprovals (drafted): ${e1.message}`);
  if (e2) throw new Error(`getPendingApprovals (resolved): ${e2.message}`);

  const resolvedThreads = new Set((resolved ?? []).map((r) => r.thread_id as string));
  return ((drafted ?? []) as { thread_id: string | null; founder: string | null; company: string | null; region: string | null; created_at: string }[])
    .filter((d) => d.thread_id && !resolvedThreads.has(d.thread_id))
    .map((d) => ({
      threadId: d.thread_id as string,
      founder: d.founder,
      company: d.company,
      region: d.region,
      draftedAt: d.created_at,
    }));
});

/**
 * Salud + última actividad de cada agente conocido. `watchdog_stall`/`watchdog_recovered` son la señal
 * autoritativa de salud (ver notify-watchdog.py); si ninguno de los dos ha disparado nunca, queda
 * "unknown" en vez de asumir "healthy" por defecto.
 */
export const getAgentSummaries = cache(async (): Promise<ReturnType<typeof buildSummary>[]> => {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const results = await Promise.all(
    KNOWN_AGENTS.map(async (agent) => {
      const [{ data: lastRun }, { data: watchdogRows }, { count: runsToday }, { count: eventsToday }] =
        await Promise.all([
          hubDb
            .from("agent_audit_runs")
            .select("started_at, status")
            .eq("agent_id", agent.id)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          hubDb
            .from("agent_audit_events")
            .select("event_type, created_at")
            .eq("agent_id", agent.id)
            .in("event_type", ["watchdog_stall", "watchdog_recovered"])
            .order("created_at", { ascending: false })
            .limit(1),
          hubDb
            .from("agent_audit_runs")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", agent.id)
            .gte("started_at", todayIso),
          hubDb
            .from("agent_audit_events")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", agent.id)
            .gte("created_at", todayIso),
        ]);

      const health: AgentHealth =
        watchdogRows && watchdogRows.length > 0
          ? watchdogRows[0].event_type === "watchdog_stall"
            ? "stalled"
            : "healthy"
          : "unknown";

      return buildSummary(agent, lastRun as { started_at: string; status: AgentRunStatus } | null, health,
        runsToday ?? 0, eventsToday ?? 0);
    }),
  );
  return results;
});

function buildSummary(
  agent: { id: string; label: string },
  lastRun: { started_at: string; status: AgentRunStatus } | null,
  health: AgentHealth,
  runsToday: number,
  eventsToday: number,
) {
  return {
    agentId: agent.id,
    label: agent.label,
    health,
    lastRunAt: lastRun?.started_at ?? null,
    lastRunStatus: lastRun?.status ?? null,
    runsToday,
    eventsToday,
  };
}

/**
 * Para el mapa de sistemas: cuántos correos (events@) y cuántas páginas web (Exa) evaluó el agente events
 * desde `sinceIso`, a partir del `detail.source` que registra save-events.py. Los remitentes rechazados
 * cuentan como correo.
 */
export const getEventsSourceCounts = cache(async (sinceIso: string): Promise<Record<string, number>> => {
  const { data, error } = await hubDb
    .from("agent_audit_events")
    .select("event_type, detail")
    .eq("agent_id", "events")
    .in("event_type", ["event_publicado", "event_descartado", "event_duplicado", "event_remitente_rechazado"])
    .gte("created_at", sinceIso);
  if (error) throw new Error(`getEventsSourceCounts: ${error.message}`);
  const out: Record<string, number> = { "source:email": 0, "source:exa": 0 };
  for (const row of (data ?? []) as { event_type: string; detail: { source?: string } | null }[]) {
    const src = row.event_type === "event_remitente_rechazado" ? "email" : row.detail?.source;
    if (src === "email" || src === "exa") out[`source:${src}`] += 1;
  }
  return out;
});
