/** Tipos y catálogos compartidos para el dashboard de auditoría de agentes (`/agentes`). Los datos
 * viven en `hub.agent_audit_runs` / `hub.agent_audit_events` (ver src/lib/supabase/agents.ts) — ambos
 * escritos por los propios agentes (`inbound-follow-up` y `events`) a través de un script compartido en
 * el VPS, no por esta app. */

export type AgentRunStatus = "running" | "success" | "error" | "no_op";
export type AgentPass = "fast" | "slow" | "email" | "exa" | null;

export type AgentRun = {
  id: string;
  agentId: string;
  pass: AgentPass;
  trigger: string | null;
  startedAt: string;
  endedAt: string | null;
  status: AgentRunStatus;
  itemsIn: number;
  summary: string | null;
  error: string | null;
};

/** event_type: catálogo cerrado, ver audit_log.py en el repo del agente para la lista autoritativa. */
export type AgentEvent = {
  id: string;
  runId: string | null;
  agentId: string;
  eventType: string;
  messageId: string | null;
  threadId: string | null;
  founder: string | null;
  company: string | null;
  region: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type AgentHealth = "healthy" | "stalled" | "unknown";

export type AgentSummary = {
  agentId: string;
  label: string;
  health: AgentHealth;
  lastRunAt: string | null;
  lastRunStatus: AgentRunStatus | null;
  eventsToday: number;
  runsToday: number;
};

export type PendingApproval = {
  threadId: string;
  founder: string | null;
  company: string | null;
  region: string | null;
  draftedAt: string;
};

/** Agentes que escriben a esta auditoría, por ahora solo uno — cualquier otro (milu, main, el de
 * LinkedIn outreach) puede sumarse más adelante sin cambiar el modelo, solo añadiendo su entrada aquí.
 * `description`/`vpsPath` alimentan el hover de AgentPulseCard (2026-11-03, operator request). */
export const KNOWN_AGENTS: { id: string; label: string; emoji: string; description: string; vpsPath: string }[] = [
  {
    id: "inbound-follow-up",
    label: "Inbound Follow-Up",
    emoji: "📨",
    description:
      "Lee los correos nuevos a startups@decelera.com, registra cada lead en Attio y gestiona la primera " +
      "respuesta automática (solo EU) y las conversaciones de seguimiento con founders, siempre con " +
      "aprobación humana en Slack para cualquier cosa más allá del primer correo.",
    vpsPath: "/home/maru/.openclaw/agents/inbound-follow-up",
  },
  {
    id: "events",
    label: "Events",
    emoji: "📅",
    description:
      "Lee lo que el equipo envía a events@decelera.com (y una búsqueda semanal en Exa), decide qué eventos " +
      "de startups/VC merecen la pena, los guarda en el calendario del hub y los publica en #events con " +
      "botones Voy / No voy que gestionan la invitación en Google Calendar.",
    vpsPath: "/home/maru/.openclaw/agents/events",
  },
];

export const EVENT_LABEL: Record<string, string> = {
  attio_deal_created: "Lead nuevo registrado en Attio",
  attio_deal_merged: "Lead ya existente actualizado",
  attio_needs_review: "Marcado para revisión humana",
  first_reply_queued: "Primera respuesta en cola",
  first_reply_sent: "Primera respuesta enviada",
  reply_drafted: "Borrador listo para aprobar",
  approval_sent: "Respuesta aprobada y enviada",
  approval_rejected: "Respuesta rechazada",
  reply_escalated: "Escalado a un humano",
  watchdog_stall: "El agente lleva varias veces sin avanzar",
  watchdog_recovered: "El agente volvió a avanzar",
  event_publicado: "Evento publicado",
  event_descartado: "Evento descartado",
  event_duplicado: "Evento duplicado (ya estaba)",
  event_remitente_rechazado: "Correo de remitente no autorizado",
  event_sin_fecha_avisado: "Evento sin fecha (aviso en #events)",
  event_slack_posted: "Publicado en #events y Calendar",
  event_rsvp_voy: "Alguien va (invitación enviada)",
  event_rsvp_no_voy: "Alguien no va",
};

export const EVENT_ICON: Record<string, string> = {
  attio_deal_created: "🏢",
  attio_deal_merged: "🔄",
  attio_needs_review: "🔎",
  first_reply_queued: "⏳",
  first_reply_sent: "📨",
  reply_drafted: "📝",
  approval_sent: "✅",
  approval_rejected: "🚫",
  reply_escalated: "🙋",
  watchdog_stall: "⚠️",
  watchdog_recovered: "💚",
  event_publicado: "📅",
  event_descartado: "🗑️",
  event_duplicado: "🔁",
  event_remitente_rechazado: "🛡️",
  event_sin_fecha_avisado: "⚠️",
  event_slack_posted: "💬",
  event_rsvp_voy: "✅",
  event_rsvp_no_voy: "👋",
};

export function eventLabel(eventType: string): string {
  return EVENT_LABEL[eventType] ?? eventType;
}

export function eventIcon(eventType: string): string {
  return EVENT_ICON[eventType] ?? "•";
}

/** `Date.now()` wrapped in a plain helper (not inline in a Server Component body) — same pattern as
 * GanttView.tsx's own comment on this: a component render function must stay pure, impure reads like
 * the clock belong in a helper the render just calls, not inline in the component itself. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// --- Diagrama de flujo (Opción A: forma fija, estadísticas en vivo) ---
//
// Los nodos y las flechas se definen a mano por agente (reflejan el SKILL.md de cada uno), y cada nodo
// se anota con cuántas veces disparó ese tipo de evento en la ventana de tiempo elegida — ver
// FlowDiagram.tsx. No es una animación en vivo de cada ejecución (eso quedó descartado el 2026-11-03:
// cada ejecución dura 30-60s y ocurre cada 5 min o 2 veces al día, nadie se va a quedar mirándolo
// correr). Si se quiere "repetir" una ejecución concreta más adelante, se resuelve resaltando sobre
// este mismo diagrama la secuencia de eventos de ese run_id — no hace falta un modelo de datos nuevo.
export type FlowTone = "neutral" | "info" | "warning" | "progress" | "success" | "critical";

export type FlowNode = {
  id: string;
  label: string;
  icon: string;
  tone: FlowTone;
  eventTypes: string[];
  col: number;
  row: number;
};
export type FlowEdge = { from: string; to: string };

export const AGENT_FLOWS: Record<string, { nodes: FlowNode[]; edges: FlowEdge[] }> = {
  "inbound-follow-up": {
    nodes: [
      { id: "intake", label: "Correo nuevo", icon: "📧", tone: "neutral", eventTypes: [], col: 0, row: 1 },
      { id: "attio", label: "Registrar en Attio", icon: "🏢", tone: "info", eventTypes: ["attio_deal_created", "attio_deal_merged"], col: 1, row: 1 },
      { id: "needs_review", label: "Revisión humana", icon: "🔎", tone: "warning", eventTypes: ["attio_needs_review"], col: 2, row: 0 },
      { id: "queue", label: "Cola (EU)", icon: "⏳", tone: "progress", eventTypes: ["first_reply_queued"], col: 2, row: 2 },
      { id: "sent1", label: "1ª respuesta enviada", icon: "📨", tone: "progress", eventTypes: ["first_reply_sent"], col: 3, row: 2 },
      { id: "draft", label: "Founder responde → borrador", icon: "💬", tone: "progress", eventTypes: ["reply_drafted"], col: 4, row: 2 },
      { id: "approved", label: "Aprobada y enviada", icon: "✅", tone: "success", eventTypes: ["approval_sent"], col: 5, row: 1 },
      { id: "rejected", label: "Rechazada", icon: "🚫", tone: "critical", eventTypes: ["approval_rejected"], col: 5, row: 2 },
      { id: "escalated", label: "Escalado", icon: "🙋", tone: "warning", eventTypes: ["reply_escalated"], col: 5, row: 3 },
    ],
    edges: [
      { from: "intake", to: "attio" },
      { from: "attio", to: "needs_review" },
      { from: "attio", to: "queue" },
      { from: "queue", to: "sent1" },
      { from: "sent1", to: "draft" },
      { from: "draft", to: "approved" },
      { from: "draft", to: "rejected" },
      { from: "draft", to: "escalated" },
    ],
  },
  events: {
    nodes: [
      { id: "email", label: "Correo a events@", icon: "📧", tone: "neutral", eventTypes: [], col: 0, row: 0 },
      { id: "exa", label: "Búsqueda semanal (Exa)", icon: "🔎", tone: "neutral", eventTypes: [], col: 0, row: 2 },
      { id: "rejected", label: "Remitente no autorizado", icon: "🛡️", tone: "warning", eventTypes: ["event_remitente_rechazado"], col: 1, row: 0 },
      { id: "judge", label: "El agente evalúa", icon: "🧠", tone: "info", eventTypes: ["event_publicado", "event_descartado", "event_duplicado"], col: 1, row: 1 },
      { id: "discarded", label: "Descartado", icon: "🗑️", tone: "neutral", eventTypes: ["event_descartado"], col: 2, row: 0 },
      { id: "published", label: "Guardado en el hub", icon: "📅", tone: "progress", eventTypes: ["event_publicado"], col: 2, row: 1 },
      { id: "duplicate", label: "Duplicado", icon: "🔁", tone: "neutral", eventTypes: ["event_duplicado"], col: 2, row: 2 },
      { id: "no_date", label: "Sin fecha → aviso en #events", icon: "⚠️", tone: "warning", eventTypes: ["event_sin_fecha_avisado"], col: 3, row: 0 },
      { id: "posted", label: "#events + Calendar", icon: "💬", tone: "progress", eventTypes: ["event_slack_posted"], col: 3, row: 1 },
      { id: "voy", label: "Voy → invitación", icon: "✅", tone: "success", eventTypes: ["event_rsvp_voy"], col: 4, row: 0 },
      { id: "no_voy", label: "No voy", icon: "👋", tone: "neutral", eventTypes: ["event_rsvp_no_voy"], col: 4, row: 2 },
    ],
    edges: [
      { from: "email", to: "rejected" },
      { from: "email", to: "judge" },
      { from: "exa", to: "judge" },
      { from: "judge", to: "discarded" },
      { from: "discarded", to: "no_date" },
      { from: "judge", to: "published" },
      { from: "judge", to: "duplicate" },
      { from: "published", to: "posted" },
      { from: "posted", to: "voy" },
      { from: "posted", to: "no_voy" },
    ],
  },
};
