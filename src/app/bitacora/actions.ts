"use server";

import { requireMember } from "@/lib/hub";
import { ENTRY_KINDS, ENTRY_STATUSES, type EntryKind, type EntryStatus } from "@/lib/bitacora";
import { TEAMS, type Team } from "@/lib/teams";
import { hubDb } from "@/lib/supabase/hub";

/** Como en Proyectos: sin `revalidatePath`; el cliente es optimista y refresca si falla. */

export async function createEntry(input: {
  body: string;
  kind: EntryKind;
  team: Team | null;
}): Promise<{ id: string; createdAt: string }> {
  const member = await requireMember();
  const body = input.body.trim().slice(0, 4000);
  if (!body) throw new Error("empty entry");
  const kind = ENTRY_KINDS.includes(input.kind) ? input.kind : "idea";
  const team = input.team && TEAMS.includes(input.team) ? input.team : null;
  const { data, error } = await hubDb
    .from("log_entries")
    .insert({ body, kind, team, author_id: member.id })
    .select("id, created_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create entry failed");
  return { id: data.id as string, createdAt: data.created_at as string };
}

type EntryPatch = {
  body?: string;
  kind?: EntryKind;
  status?: EntryStatus;
  team?: Team | null;
  ownerId?: string | null;
  dueDate?: string | null;
};

export async function updateEntry(id: string, patch: EntryPatch): Promise<void> {
  await requireMember();
  const clean: Record<string, unknown> = {};
  if (typeof patch.body === "string" && patch.body.trim()) clean.body = patch.body.trim().slice(0, 4000);
  if (patch.kind && ENTRY_KINDS.includes(patch.kind)) clean.kind = patch.kind;
  if (patch.status && ENTRY_STATUSES.includes(patch.status)) clean.status = patch.status;
  if ("team" in patch) clean.team = patch.team && TEAMS.includes(patch.team) ? patch.team : null;
  if ("ownerId" in patch) clean.owner_id = patch.ownerId || null;
  if ("dueDate" in patch) clean.due_date = patch.dueDate || null;
  if (Object.keys(clean).length === 0) return;
  const { error } = await hubDb.from("log_entries").update(clean).eq("id", id);
  if (error) throw new Error(`updateEntry: ${error.message}`);
}

export async function deleteEntry(id: string): Promise<void> {
  await requireMember();
  const { error } = await hubDb.from("log_entries").delete().eq("id", id);
  if (error) throw new Error(`deleteEntry: ${error.message}`);
}

/** Convierte la entrada en un proyecto nuevo (primera columna del Kanban) y la marca promovida. */
export async function promoteToProject(id: string): Promise<{ projectId: string; title: string }> {
  await requireMember();
  const { data: entry, error: e1 } = await hubDb
    .from("log_entries")
    .select("body, team, owner_id")
    .eq("id", id)
    .single();
  if (e1 || !entry) throw new Error(e1?.message ?? "entry not found");

  const [first, ...rest] = (entry.body as string).split("\n");
  const title = first.trim().slice(0, 120) || "Nuevo proyecto";
  const info = rest.join("\n").trim();

  const { data: col } = await hubDb
    .from("project_columns")
    .select("id")
    .order("position")
    .limit(1)
    .maybeSingle();
  const columnId = (col?.id as string | undefined) ?? null;
  const scope = hubDb.from("projects").select("position");
  const { data: last } = await (columnId ? scope.eq("column_id", columnId) : scope.is("column_id", null))
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;

  const { data: project, error: e2 } = await hubDb
    .from("projects")
    .insert({
      title,
      info,
      team: entry.team,
      owner_id: entry.owner_id,
      column_id: columnId,
      position,
    })
    .select("id")
    .single();
  if (e2 || !project) throw new Error(e2?.message ?? "create project failed");

  const { error: e3 } = await hubDb
    .from("log_entries")
    .update({ status: "promoted", project_id: project.id })
    .eq("id", id);
  if (e3) throw new Error(`promoteToProject: ${e3.message}`);
  return { projectId: project.id as string, title };
}

/** Añade la entrada como tarea de la checklist de un proyecto existente y la marca promovida. */
export async function addToProject(
  id: string,
  projectId: string,
): Promise<{ projectId: string; title: string }> {
  await requireMember();
  const { data: entry, error: e1 } = await hubDb
    .from("log_entries")
    .select("body, owner_id, due_date")
    .eq("id", id)
    .single();
  if (e1 || !entry) throw new Error(e1?.message ?? "entry not found");
  const { data: project, error: e2 } = await hubDb
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single();
  if (e2 || !project) throw new Error(e2?.message ?? "project not found");

  const { data: last } = await hubDb
    .from("project_tasks")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  const { error: e3 } = await hubDb.from("project_tasks").insert({
    project_id: projectId,
    label: (entry.body as string).split("\n")[0].trim().slice(0, 200),
    position,
    owner_id: entry.owner_id,
    due_date: entry.due_date,
  });
  if (e3) throw new Error(`addToProject: ${e3.message}`);

  const { error: e4 } = await hubDb
    .from("log_entries")
    .update({ status: "promoted", project_id: projectId })
    .eq("id", id);
  if (e4) throw new Error(`addToProject: ${e4.message}`);
  return { projectId, title: project.title as string };
}
