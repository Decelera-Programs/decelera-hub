import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildHddDashboard, type RawFounder, type RawHumanDD, type RawStartup, type RawSubmission } from "./aggregate";
import { mockHddDashboardData } from "./mock";
import type { HddDashboardData } from "./types";

// Lectura SOLO desde servidor con la service-role key, schema `public` (Person, HumanDD, ...).
// Cliente propio y perezoso: no tocamos ./supabase.ts (schema historico) ni ./supabase/hub.ts.
let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
  client = createClient(url, key, { db: { schema: "public" }, auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const PAGE = 1000;

/** Pagina con range() hasta agotar filas (PostgREST corta en 1000 por defecto). Orden estable por `order`. */
async function fetchAll<T>(table: string, columns: string, order: string, filter?: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db().from(table).select(columns);
    if (filter) q = filter(q);
    const { data, error } = await q.order(order, { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(`HDD: error leyendo ${table}: ${error.message}`);
    rows.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function getHddDashboardData(): Promise<HddDashboardData> {
  if (process.env.HDD_USE_MOCK === "1") return mockHddDashboardData();

  // Un solo juego de queries en paralelo (sin N+1); el cruce se hace en memoria.
  const [startups, founders, team, humanDD, oneOnOnes, submissions] = await Promise.all([
    fetchAll<RawStartup>("Startup", "id, name, logo_url, sector", "id"),
    fetchAll<RawFounder>("Person", "id, full_name, photo_url, startup_id, legal_maze, olbi_brs, olbi_brs_post", "id", (q) => q.eq("contact_type", "founder")),
    fetchAll<{ id: string; full_name: string | null }>("Person", "id, full_name", "id", (q) => q.in("contact_type", ["team", "experience_maker"])),
    fetchAll<RawHumanDD>("HumanDD", "evaluator_id, event, founder_id, startup_id, scores, submission_date", "id"),
    fetchAll<{ id: string; startup_id: string | null }>("OneOnOne", "id, startup_id", "id"),
    fetchAll<{ one_on_one_id: string; team_kpis: unknown; hard_skills: unknown }>(
      "OneOnOneAudioSubmission", "one_on_one_id, team_kpis, hard_skills", "id", (q) => q.or("team_kpis.not.is.null,hard_skills.not.is.null"),
    ),
  ]);

  const startupOf = new Map(oneOnOnes.map((o) => [o.id, o.startup_id]));
  const subs: RawSubmission[] = submissions.map((s) => ({
    startup_id: startupOf.get(s.one_on_one_id) ?? null, team_kpis: s.team_kpis, hard_skills: s.hard_skills,
  }));

  return buildHddDashboard({
    startups, founders, humanDD, submissions: subs,
    teamNames: Object.fromEntries(team.map((p) => [p.id, p.full_name ?? ""])),
  });
}
