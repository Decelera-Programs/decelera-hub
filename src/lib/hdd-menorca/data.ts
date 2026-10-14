import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildMenorcaDashboard, type RawProgramDd } from "./aggregate";
import type { MenorcaDashboardData } from "./types";

export const MENORCA_EVENT = "Menorca 2026";
const PAGE = 1000;

// `historico` no es legible por anon/authenticated (RLS + REVOKE, 2026-09-29): lectura SOLO desde servidor con la
// service-role key. Cliente propio y perezoso (como src/lib/hdd/data.ts), sin depender de ./supabase.ts.
let client: SupabaseClient<any, "historico"> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
function db(): SupabaseClient<any, "historico"> { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
  client = createClient(url, key, { db: { schema: "historico" }, auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Lee historico.program_dd de Menorca 2026 (una fila por founder). Todo sale de Supabase: nada va fijo en el código. */
export async function getMenorcaDashboardData(): Promise<MenorcaDashboardData> {
  const rows: RawProgramDd[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("program_dd")
      .select("id, person_name, company_name, company_id, person_id, metadata, human_dd")
      .eq("event_name", MENORCA_EVENT)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`HDD Menorca: error leyendo historico.program_dd: ${error.message}`);
    rows.push(...((data ?? []) as RawProgramDd[]));
    if (!data || data.length < PAGE) break;
  }
  return buildMenorcaDashboard(rows);
}
