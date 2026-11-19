import "server-only";
import { hubDb } from "@/lib/supabase/hub";
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
/** Elemento citable del hub (agente, proyecto o prioridad): se muestra como fuente cuando la respuesta lo cita. */
export type HubItem = { ref: string; kind: string; name: string; type: string; snippet: string };

const clip = (s: string | null | undefined, n: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const HEALTH_PROJECT: Record<string, string> = {
  on_track: "en marcha",
  at_risk: "en riesgo",
  blocked: "bloqueado",
  done: "terminado",
};

/**
 * Proyectos del hub (tablero Now/Next/Done), con responsable, fechas, criterio de éxito, tareas y la prioridad
 * estratégica a la que cuelgan, más las prioridades estratégicas activas. Texto ya preparado, no SQL abierto:
 * así no se expone nada de miembros más allá del nombre. Los proyectos terminados van sin detalle de tareas.
 */
export async function loadProjects(): Promise<{ text: string; items: HubItem[] }> {
  const [projects, columns, tasks, links, prios, members] = await Promise.all([
    hubDb.from("projects").select("id, title, info, column_id, position, health, owner_id, team, start_date, end_date, priority, success_criteria").order("position"),
    hubDb.from("project_columns").select("id, label, position").order("position"),
    hubDb.from("project_tasks").select("project_id, label, done, owner_id, due_date, position").order("position"),
    hubDb.from("project_priorities").select("project_id, priority_id"),
    hubDb.from("strategic_priorities").select("id, year, position, title, short_name, context, why_it_matters, success_metrics, is_active").eq("is_active", true).order("position"),
    hubDb.from("members").select("id, full_name"),
  ]);
  const name = new Map((members.data ?? []).map((m) => [m.id as string, (m.full_name as string | null) ?? ""]));
  const col = new Map((columns.data ?? []).map((c) => [c.id as string, c.label as string]));
  const colOrder = new Map((columns.data ?? []).map((c, i) => [c.id as string, i]));
  // El nombre corto trae un prefijo "P1 ·" que se confundiría con las marcas [P1] de los proyectos: se quita.
  const plain = (s: string) => s.replace(/^P\d+\s*·\s*/, "");
  const prioShort = new Map((prios.data ?? []).map((p) => [p.id as string, plain((p.short_name as string | null) || (p.title as string))]));

  const items: HubItem[] = [];
  const sorted = [...(projects.data ?? [])].sort(
    (a, b) => (colOrder.get(a.column_id as string) ?? 99) - (colOrder.get(b.column_id as string) ?? 99),
  );
  const projectBlocks = sorted.map((p, i) => {
    const ref = `P${i + 1}`;
    const column = col.get(p.column_id as string) ?? "";
    const done = column.toLowerCase() === "done" || p.health === "done";
    const mine = (tasks.data ?? []).filter((t) => t.project_id === p.id);
    const prio = (links.data ?? []).filter((l) => l.project_id === p.id).map((l) => prioShort.get(l.priority_id as string)).filter(Boolean);
    const taskLine = done
      ? `Tareas: ${mine.filter((t) => t.done).length}/${mine.length} hechas`
      : mine.length
        ? "Tareas:\n" +
          mine
            .map((t) => `  ${t.done ? "[hecha]" : "[pendiente]"} ${clip(t.label as string, 90)}${t.owner_id ? ` · ${name.get(t.owner_id as string) || "?"}` : ""}${t.due_date ? ` · vence ${t.due_date}` : ""}`)
            .join("\n")
        : "Tareas: ninguna";
    const head = [
      column && `Columna: ${column}`,
      `Estado: ${HEALTH_PROJECT[p.health as string] ?? p.health}`,
      p.owner_id && `Responsable: ${name.get(p.owner_id as string) || "?"}`,
      p.team && `Equipo: ${p.team}`,
      p.priority && `Prioridad: ${p.priority}`,
      (p.start_date || p.end_date) && `Fechas: ${p.start_date ?? "?"} → ${p.end_date ?? "?"}`,
      prio.length && `Prioridad estratégica: ${prio.join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · ");
    items.push({ ref, kind: "Hub", name: p.title as string, type: "Proyecto", snippet: clip(p.info as string, 280) });
    return [
      `[${ref}] ${p.title}`,
      head,
      p.info && `Descripción: ${clip(p.info as string, 450)}`,
      p.success_criteria && `Criterio de éxito: ${clip(p.success_criteria as string, 280)}`,
      taskLine,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const prioBlocks = (prios.data ?? []).map((p, i) => {
    const ref = `S${i + 1}`;
    const short = p.short_name ? plain(p.short_name as string) : "";
    items.push({ ref, kind: "Hub", name: short || (p.title as string), type: "Prioridad estratégica", snippet: clip(p.context as string, 280) });
    return [
      `[${ref}] ${p.title}${short ? ` (${short})` : ""} · ${p.year}`,
      p.context && `Contexto: ${clip(p.context as string, 400)}`,
      p.why_it_matters && `Por qué importa: ${clip(p.why_it_matters as string, 300)}`,
      p.success_metrics && `Métricas de éxito: ${clip(typeof p.success_metrics === "string" ? p.success_metrics : JSON.stringify(p.success_metrics), 300)}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return {
    text:
      `Proyectos del hub (${sorted.length}), ordenados por columna del tablero:\n\n${projectBlocks.join("\n\n")}` +
      `\n\nPrioridades estratégicas activas:\n\n${prioBlocks.join("\n\n")}`,
    items,
  };
}

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
