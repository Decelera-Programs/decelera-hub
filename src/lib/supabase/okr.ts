import "server-only";
import { cache } from "react";
import { OKR_YEAR, type OkrItem, type OkrKind, type OkrUnit, type Quad } from "@/lib/okr";
import { hubDb } from "@/lib/supabase/hub";

type ItemRow = {
  id: string;
  year: number;
  parent_id: string | null;
  kind: OkrKind;
  position: number;
  code: string;
  title: string;
  group_label: string | null;
  owner: string;
  unit: OkrUnit;
  direction: "up" | "down";
  baseline: number | null;
  target: number | null;
  target_q1: number | null;
  target_q2: number | null;
  target_q3: number | null;
  target_q4: number | null;
  actual_q1: number | null;
  actual_q2: number | null;
  actual_q3: number | null;
  actual_q4: number | null;
  key_project: string;
  notes: string;
};

// PostgREST devuelve `numeric` como número (o string según versión): normalizamos.
const num = (v: number | string | null): number | null => (v == null ? null : Number(v));

export const getOkrItems = cache(async (year: number = OKR_YEAR): Promise<OkrItem[]> => {
  const [items, links] = await Promise.all([
    hubDb.from("okr_items").select("*").eq("year", year).order("position"),
    hubDb.from("project_okr_links").select("project_id, item_id"),
  ]);
  // Igual que en proyectos: una lectura fallida no debe verse como "no hay OKRs".
  if (items.error) throw new Error(`getOkrItems: ${items.error.message}`);
  if (links.error) throw new Error(`getOkrItems(links): ${links.error.message}`);

  const projectsByItem = new Map<string, string[]>();
  for (const l of (links.data ?? []) as { project_id: string; item_id: string }[]) {
    const list = projectsByItem.get(l.item_id) ?? [];
    list.push(l.project_id);
    projectsByItem.set(l.item_id, list);
  }

  return ((items.data ?? []) as ItemRow[]).map((r) => ({
    id: r.id,
    year: r.year,
    parentId: r.parent_id,
    kind: r.kind,
    position: r.position,
    code: r.code,
    title: r.title,
    group: r.group_label,
    owner: r.owner,
    unit: r.unit,
    direction: r.direction,
    baseline: num(r.baseline),
    target: num(r.target),
    targets: [r.target_q1, r.target_q2, r.target_q3, r.target_q4].map(num) as Quad<number | null>,
    actuals: [r.actual_q1, r.actual_q2, r.actual_q3, r.actual_q4].map(num) as Quad<number | null>,
    keyProject: r.key_project,
    notes: r.notes,
    projectIds: projectsByItem.get(r.id) ?? [],
  }));
});
