import "server-only";
import { historico } from "./supabase";
import { mapRawDeal } from "./transform";
import type { RawDeal } from "./types";

const DEAL_COLUMNS = "record_id, name, stage, status, status_6, reference_3";

const OPENCALL_STAGES = ["Mexico 2026", "Leads Mexico 2026"];

export async function getOpencallDeals() {
  const { data, error } = await historico
    .from("deals")
    .select(DEAL_COLUMNS)
    .in("stage", OPENCALL_STAGES);

  if (error) {
    throw new Error(`Error consultando historico.deals: ${error.message}`);
  }

  return (data as RawDeal[]).map(mapRawDeal);
}
