import "server-only";
import { historico } from "@/lib/supabase";
import { buildMenorcaDashboard, type RawProgramDd } from "./aggregate";
import type { MenorcaDashboardData } from "./types";

export const MENORCA_EVENT = "Menorca 2026";
const PAGE = 1000;

/** Lee historico.program_dd de Menorca 2026 (una fila por founder). Todo sale de Supabase: nada va fijo en el código. */
export async function getMenorcaDashboardData(): Promise<MenorcaDashboardData> {
  const rows: RawProgramDd[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await historico
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
