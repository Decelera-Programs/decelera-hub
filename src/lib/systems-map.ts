/**
 * Mapa de sistemas (página /mapa, 2026-11-04 — Carlos: "nodos que sean attio, gmail, exa, supabase… y se vea el
 * flujo de datos que hacen los agentes"). Los NODOS son los sistemas donde viven los datos; las FLECHAS son lo
 * que mueve cada agente de un sistema a otro. Solo agentes (no apps como el formulario de aplicación).
 *
 * Definido a mano a partir de lo que hace cada agente en el VPS (~/.openclaw/agents + skills de Maru). Si un
 * agente cambia de flujo, se actualiza aquí. Las flechas con `eventTypes` (o `source`) se anotan con la
 * actividad real de los últimos 7 días (hub.agent_audit_events); Maru todavía no registra su actividad en el
 * Brain, así que sus flechas salen sin cifra.
 */

export type MapAgentId = "main" | "inbound-follow-up" | "events";

export const MAP_AGENTS: { id: MapAgentId; label: string; emoji: string; color: string; what: string }[] = [
  {
    id: "main",
    label: "Maru",
    emoji: "🤝",
    color: "#e07b1a",
    what: "Outreach por LinkedIn a founders (EU y LATAM) y seguimiento de calls reservadas.",
  },
  {
    id: "inbound-follow-up",
    label: "Inbound Follow-Up",
    emoji: "📨",
    color: "#1158e5",
    what: "Correos de startups a startups@: lead en Attio, primera respuesta y conversación con aprobación.",
  },
  {
    id: "events",
    label: "Events",
    emoji: "📅",
    color: "#0b9bb0",
    what: "Eventos de VC y tecnología (events@ y Exa) al Brain, a #events y a Google Calendar.",
  },
];

export type MapSystem = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  x: number;
  y: number;
};

export const NODE_W = 196;
export const NODE_H = 66;

// Izquierda: de dónde entran los datos · centro: dónde se guardan · derecha: dónde se avisa / se actúa.
export const MAP_SYSTEMS: MapSystem[] = [
  { id: "gmail", label: "Gmail", sub: "startups@ · events@", icon: "✉️", x: 30, y: 100 },
  { id: "exa", label: "Exa", sub: "búsqueda web", icon: "🔎", x: 30, y: 255 },
  { id: "linkedin", label: "LinkedIn", sub: "Sales Navigator", icon: "💼", x: 30, y: 420 },
  { id: "calendly", label: "Calendly", sub: "calls reservadas", icon: "🗓️", x: 30, y: 545 },
  { id: "supabase", label: "Brain", sub: "Supabase · eventos", icon: "🧠", x: 492, y: 80 },
  { id: "attio", label: "Attio", sub: "CRM · deal flow", icon: "🏢", x: 492, y: 390 },
  { id: "gcal", label: "Google Calendar", sub: "invitaciones", icon: "📆", x: 954, y: 40 },
  { id: "slack", label: "Slack", sub: "canales", icon: "💬", x: 954, y: 340 },
];

export type MapFlow = {
  id: string;
  agent: MapAgentId;
  from: string;
  to: string;
  label: string;
  when: string;
  /** Tipos de evento de auditoría que cuentan como actividad de esta flecha. */
  eventTypes?: string[];
  /** Para flechas que se distinguen por origen del dato (events: email vs exa). */
  source?: "email" | "exa";
};

export const MAP_FLOWS: MapFlow[] = [
  // Inbound Follow-Up
  { id: "i-lead", agent: "inbound-follow-up", from: "gmail", to: "attio", label: "Registra el lead", when: "cada 5 min",
    eventTypes: ["attio_deal_created", "attio_deal_merged"] },
  { id: "i-reply", agent: "inbound-follow-up", from: "gmail", to: "gmail", label: "Responde al founder", when: "9:00 y 18:00",
    eventTypes: ["first_reply_sent", "approval_sent"] },
  { id: "i-slack", agent: "inbound-follow-up", from: "gmail", to: "slack", label: "Borradores para aprobar", when: "al responder un founder",
    eventTypes: ["reply_drafted", "attio_needs_review", "reply_escalated"] },
  { id: "i-report", agent: "inbound-follow-up", from: "attio", to: "slack", label: "Informe de conversión", when: "lunes 9:30" },
  // Events
  { id: "e-mail", agent: "events", from: "gmail", to: "supabase", label: "Eventos reenviados", when: "9:00 y 18:00", source: "email" },
  { id: "e-exa", agent: "events", from: "exa", to: "supabase", label: "VC + tech en Europa", when: "lunes 9:00", source: "exa" },
  { id: "e-post", agent: "events", from: "supabase", to: "slack", label: "Publica en #events", when: "al guardar",
    eventTypes: ["event_slack_posted"] },
  { id: "e-rsvp", agent: "events", from: "slack", to: "gcal", label: "Voy → invitación", when: "cada minuto",
    eventTypes: ["event_rsvp_voy", "event_rsvp_no_voy"] },
  // Maru
  { id: "m-inmail", agent: "main", from: "linkedin", to: "linkedin", label: "InMails a founders", when: "L–V" },
  { id: "m-leads", agent: "main", from: "linkedin", to: "attio", label: "Leads · enriquece stealth", when: "con cada envío" },
  { id: "m-summary", agent: "main", from: "linkedin", to: "slack", label: "Resumen de outreach", when: "L–V 9:00" },
  { id: "m-calls", agent: "main", from: "calendly", to: "slack", label: "Calls reservadas", when: "lunes" },
];

/** Actividad de una flecha en los últimos 7 días, o null si ese agente no la registra. */
export function flowCount(f: MapFlow, counts: Record<string, Record<string, number>>): number | null {
  const c = counts[f.agent];
  if (!c) return null;
  if (f.source) return c[`source:${f.source}`] ?? 0;
  if (!f.eventTypes) return null;
  return f.eventTypes.reduce((s, t) => s + (c[t] ?? 0), 0);
}

export const MAP_WIDTH = 1180;
export const MAP_HEIGHT = 640;
