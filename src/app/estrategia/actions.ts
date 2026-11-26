"use server";

import { getMember } from "@/lib/hub";
import { OKR_UNITS, OKR_YEAR, type OkrItem, type OkrKind, type OkrUnit, type Quad } from "@/lib/okr";
import { hubDb } from "@/lib/supabase/hub";

/**
 * Edición de OKR: solo admins. Como en /proyectos, estas acciones no llaman `revalidatePath`:
 * la vista aplica los cambios de forma optimista y hace `router.refresh()` si una escritura falla.
 * Devuelven siempre el estado servidor de lo escrito para que el cliente se alinee.
 */
async function requireAdminWrite(): Promise<void> {
  const member = await getMember();
  if (!member || member.role !== "admin") throw new Error("Solo los administradores pueden editar los OKR");
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error("Valor numérico no válido");
  return n;
};
const text = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);

export type OkrPatch = Partial<
  Pick<OkrItem, "title" | "owner" | "unit" | "direction" | "baseline" | "target" | "keyProject" | "notes"> & {
    targets: Quad<number | null>;
    actuals: Quad<number | null>;
  }
>;

export async function updateOkrItem(id: string, patch: OkrPatch): Promise<void> {
  await requireAdminWrite();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) {
    const t = text(patch.title, 300);
    if (!t) throw new Error("El título no puede estar vacío");
    row.title = t;
  }
  if (patch.owner !== undefined) row.owner = text(patch.owner, 80);
  if (patch.keyProject !== undefined) row.key_project = text(patch.keyProject, 200);
  if (patch.notes !== undefined) row.notes = text(patch.notes, 2000);
  if (patch.unit !== undefined) {
    if (!OKR_UNITS.includes(patch.unit as OkrUnit)) throw new Error("Unidad no válida");
    row.unit = patch.unit;
  }
  if (patch.direction !== undefined) {
    if (patch.direction !== "up" && patch.direction !== "down") throw new Error("Dirección no válida");
    row.direction = patch.direction;
  }
  if (patch.baseline !== undefined) row.baseline = numOrNull(patch.baseline);
  if (patch.target !== undefined) row.target = numOrNull(patch.target);
  if (patch.targets) patch.targets.forEach((v, i) => (row[`target_q${i + 1}`] = numOrNull(v)));
  if (patch.actuals) patch.actuals.forEach((v, i) => (row[`actual_q${i + 1}`] = numOrNull(v)));

  const { error } = await hubDb.from("okr_items").update(row).eq("id", id);
  if (error) throw new Error(`updateOkrItem: ${error.message}`);
}

/** Añade un objetivo (parentId null), un KR (bajo un objetivo) o una iniciativa (bajo un KR). */
export async function createOkrItem(parentId: string | null): Promise<OkrItem> {
  await requireAdminWrite();

  let parentCode = "";
  let kind: OkrKind = "objective";
  if (parentId) {
    const { data: parent, error } = await hubDb.from("okr_items").select("code, kind").eq("id", parentId).single();
    if (error || !parent) throw new Error("Nodo padre no encontrado");
    if (parent.kind === "initiative") throw new Error("Una iniciativa no puede tener hijos");
    parentCode = parent.code as string;
    kind = parent.kind === "objective" ? "kr" : "initiative";
  }

  const siblings = parentId
    ? await hubDb.from("okr_items").select("code, position").eq("parent_id", parentId)
    : await hubDb.from("okr_items").select("code, position").is("parent_id", null).eq("year", OKR_YEAR);
  if (siblings.error) throw new Error(`createOkrItem: ${siblings.error.message}`);

  const rows = (siblings.data ?? []) as { code: string; position: number }[];
  const lastSeg = (c: string) => Number(c.split(".").pop());
  const nextSeg = Math.max(0, ...rows.map((r) => lastSeg(r.code) || 0)) + 1;
  const position = Math.max(-1, ...rows.map((r) => r.position)) + 1;
  const code = parentCode ? `${parentCode}.${nextSeg}` : String(nextSeg);

  const { data, error } = await hubDb
    .from("okr_items")
    .insert({
      year: OKR_YEAR,
      parent_id: parentId,
      kind,
      position,
      code,
      title: kind === "objective" ? "Nuevo objetivo" : kind === "kr" ? "Nuevo KR" : "Nueva iniciativa",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`createOkrItem: ${error?.message ?? "sin datos"}`);

  return {
    id: data.id,
    year: data.year,
    parentId: data.parent_id,
    kind: data.kind,
    position: data.position,
    code: data.code,
    title: data.title,
    group: data.group_label,
    owner: data.owner,
    unit: data.unit,
    direction: data.direction,
    baseline: null,
    target: null,
    targets: [null, null, null, null],
    actuals: [null, null, null, null],
    keyProject: "",
    notes: "",
    projectIds: [],
  };
}

/** Borra el nodo y todo lo que cuelga de él (FK en cascada). */
export async function deleteOkrItem(id: string): Promise<void> {
  await requireAdminWrite();
  const { error } = await hubDb.from("okr_items").delete().eq("id", id);
  if (error) throw new Error(`deleteOkrItem: ${error.message}`);
}

/** Sustituye los proyectos enlazados a un nodo. */
export async function setOkrItemProjects(itemId: string, projectIds: string[]): Promise<void> {
  await requireAdminWrite();
  const unique = [...new Set(projectIds)];
  const { error: delErr } = await hubDb.from("project_okr_links").delete().eq("item_id", itemId);
  if (delErr) throw new Error(`setOkrItemProjects: ${delErr.message}`);
  if (!unique.length) return;
  const { error } = await hubDb
    .from("project_okr_links")
    .insert(unique.map((project_id) => ({ project_id, item_id: itemId })));
  if (error) throw new Error(`setOkrItemProjects: ${error.message}`);
}
