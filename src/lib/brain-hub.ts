import "server-only";
import { hubDb } from "@/lib/supabase/hub";
import { AGENT_FLOWS, KNOWN_AGENTS, eventLabel } from "@/lib/agents";
import { MAP_AGENTS, MAP_FLOWS, MAP_SYSTEMS } from "@/lib/systems-map";
import { getAgentSummaries, getEventCountsSince } from "@/lib/supabase/agents";
import { buildOkrTree, fmtValue, flattenTree, latestActual, STATUS_LABEL, QUARTER_LABEL, type OkrNode, type OkrProject } from "@/lib/okr";
import { getOkrItems } from "@/lib/supabase/okr";

/**
 * Conocimiento del propio hub para el Brain: qué agentes hay, qué hace cada uno, de qué sistema a cuál mueve
 * datos y cuándo, y su actividad reciente. Sale de las mismas constantes que pintan /agentes y /mapa, así que
 * está siempre al día con el código; la actividad viene de hub.agent_audit_*. Solo agregados, sin correos ni
 * nombres de founders.
 */

export type HubAgentInfo = { ref: string; id: string; label: string; snippet: string };
/** Elemento citable del hub (agente, proyecto u objetivo OKR): se muestra como fuente cuando la respuesta lo cita. */
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
 * Proyectos del hub (tablero Now/Next/Done), con responsable, fechas, criterio de éxito, tareas y los OKR a los que
 * contribuyen, más los OKR 2027 (objetivos → KRs → iniciativas, con avance). Texto ya preparado, no SQL abierto:
 * así no se expone nada de miembros más allá del nombre. Los proyectos terminados van sin detalle de tareas.
 */
export async function loadProjects(): Promise<{ text: string; items: HubItem[] }> {
  const [projects, columns, tasks, okrItems, members] = await Promise.all([
    hubDb.from("projects").select("id, title, info, column_id, position, health, owner_id, team, start_date, end_date, priority, success_criteria").order("position"),
    hubDb.from("project_columns").select("id, label, position").order("position"),
    hubDb.from("project_tasks").select("project_id, label, done, owner_id, due_date, position").order("position"),
    getOkrItems(),
    hubDb.from("members").select("id, full_name"),
  ]);
  const name = new Map((members.data ?? []).map((m) => [m.id as string, (m.full_name as string | null) ?? ""]));
  const col = new Map((columns.data ?? []).map((c) => [c.id as string, c.label as string]));
  const colOrder = new Map((columns.data ?? []).map((c, i) => [c.id as string, i]));
  const okrProjects: OkrProject[] = (projects.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    health: p.health as OkrProject["health"],
    team: (p.team as string | null) ?? null,
    tasksDone: 0,
    tasksTotal: 0,
    endDate: (p.end_date as string | null) ?? null,
  }));
  const okrTree = buildOkrTree(okrItems, okrProjects, new Date());
  const okrCode = new Map(flattenTree(okrTree).map((n) => [n.item.id, n.item.code]));

  const items: HubItem[] = [];
  const sorted = [...(projects.data ?? [])].sort(
    (a, b) => (colOrder.get(a.column_id as string) ?? 99) - (colOrder.get(b.column_id as string) ?? 99),
  );
  const projectBlocks = sorted.map((p, i) => {
    const ref = `P${i + 1}`;
    const column = col.get(p.column_id as string) ?? "";
    const done = column.toLowerCase() === "done" || p.health === "done";
    const mine = (tasks.data ?? []).filter((t) => t.project_id === p.id);
    const okrs = okrItems.filter((i) => i.projectIds.includes(p.id as string)).map((i) => okrCode.get(i.id) ?? i.code);
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
      okrs.length && `OKR 2027 a los que contribuye: ${okrs.join(", ")}`,
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

  const okrLine = (n: OkrNode, indent: string): string => {
    const it = n.item;
    const last = latestActual(it);
    const metric =
      it.target != null
        ? ` · ${fmtValue(last ? last.value : it.baseline, it.unit)} → meta ${fmtValue(it.target, it.unit)}` +
          (it.targets.some((t) => t != null)
            ? ` (metas: ${it.targets.map((t, q) => `${QUARTER_LABEL[q]} ${fmtValue(t, it.unit)}`).join(", ")})`
            : "")
        : "";
    const pr = n.progress == null ? "sin medir" : `${Math.round(n.progress * 100)}%`;
    return `${indent}${it.code} ${clip(it.title, 130)} · ${pr} · ${STATUS_LABEL[n.status]}${it.owner ? ` · ${it.owner}` : ""}${metric}`;
  };
  const prioBlocks = okrTree.map((o, i) => {
    const ref = `S${i + 1}`;
    items.push({ ref, kind: "Hub", name: clip(o.item.title, 80), type: "Objetivo OKR", snippet: clip(o.item.notes || o.item.title, 280) });
    const lines = [`[${ref}] Objetivo ${o.item.code} (prioridad estratégica ${o.item.code}): ${okrLine(o, "").trim()}`];
    for (const kr of o.children) {
      lines.push(okrLine(kr, "  "));
      for (const ini of kr.children) lines.push(okrLine(ini, "    "));
    }
    return lines.join("\n");
  });

  return {
    text:
      `Proyectos del hub (${sorted.length}), ordenados por columna del tablero:\n\n${projectBlocks.join("\n\n")}` +
      `\n\nOKR 2027 = las prioridades estratégicas de la empresa ("prioridad 2" = objetivo 2). Objetivos → KRs → iniciativas; ` +
      `el % es el avance frente a la meta anual y sube desde las iniciativas; "0% · aún no toca" significa que no hay datos reales todavía, no que vaya mal; ` +
      `"tocaría" depende de la fecha de hoy:\n\n${prioBlocks.join("\n\n")}`,
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
