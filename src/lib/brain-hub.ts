import "server-only";
import { AGENT_FLOWS, KNOWN_AGENTS, eventLabel } from "@/lib/agents";
import { MAP_AGENTS, MAP_FLOWS, MAP_SYSTEMS } from "@/lib/systems-map";
import { getAgentSummaries, getEventCountsSince } from "@/lib/supabase/agents";

/**
 * Conocimiento del propio hub para el Brain: qué agentes hay, qué hace cada uno, de qué sistema a cuál mueve
 * datos y cuándo, y su actividad reciente. Sale de las mismas constantes que pintan /agentes y /mapa, así que
 * está siempre al día con el código; la actividad viene de hub.agent_audit_*. Solo agregados, sin correos ni
 * nombres de founders.
 */

export type HubAgentInfo = { ref: string; id: string; label: string; snippet: string };

const HEALTH: Record<string, string> = {
  healthy: "funcionando con normalidad",
  stalled: "atascado (el vigilante ha detectado que no avanza)",
  unknown: "sin señal de salud todavía",
};

export async function loadAgents(): Promise<{ text: string; items: HubAgentInfo[] }> {
  // En el mapa Supabase se llama "Brain"; aquí se nombra Supabase para no confundirlo con este Brain.
  const systems = new Map(
    MAP_SYSTEMS.map((s) => [s.id, s.id === "supabase" ? "Supabase (base de datos del hub)" : `${s.label}${s.sub ? ` (${s.sub})` : ""}`]),
  );
  const known = new Map(KNOWN_AGENTS.map((a) => [a.id, a]));

  // Actividad real: opcional, si falla se responde sin ella.
  const since7 = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const live = new Map<string, string>();
  try {
    const summaries = await getAgentSummaries();
    for (const s of summaries) {
      const counts = await getEventCountsSince(s.agentId, since7);
      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, n]) => `${eventLabel(t)}: ${n}`)
        .join("; ");
      live.set(
        s.agentId,
        `Estado: ${HEALTH[s.health] ?? s.health}. Última ejecución: ${s.lastRunAt ? `${s.lastRunAt.slice(0, 16).replace("T", " ")} UTC (${s.lastRunStatus})` : "sin registro"}. Hoy: ${s.runsToday} ejecuciones y ${s.eventsToday} eventos. Últimos 7 días: ${top || "sin eventos"}.`,
      );
    }
  } catch {
    /* sin actividad en vivo */
  }

  const items: HubAgentInfo[] = [];
  const blocks = MAP_AGENTS.map((a, i) => {
    const ref = `H${i + 1}`;
    const detail = known.get(a.id)?.description ?? a.what;
    const flows = MAP_FLOWS.filter((f) => f.agent === a.id)
      .map((f) => `${systems.get(f.from) ?? f.from} → ${systems.get(f.to) ?? f.to}: ${f.label} (${f.when})`)
      .join("; ");
    const steps = (AGENT_FLOWS[a.id]?.nodes ?? []).map((n) => n.label).join(" → ");
    const activity = live.get(a.id) ?? (a.id === "main" ? "No registra su actividad en el hub todavía." : "");
    items.push({ ref, id: a.id, label: a.label, snippet: detail });
    return [
      `[${ref}] ${a.label}`,
      `Qué hace: ${detail}`,
      flows && `Flujos de datos: ${flows}`,
      steps && `Pasos: ${steps}`,
      activity,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return {
    text:
      "Agentes automáticos de Decelera (se ven en las páginas Agentes y Mapa del hub; corren en un servidor aparte, no en el hub):\n\n" +
      blocks.join("\n\n"),
    items,
  };
}
