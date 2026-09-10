"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/hub";
import { PROJECT_HEALTHS, type ProjectHealth } from "@/lib/projects";
import { TEAMS, type Team } from "@/lib/teams";
import { hubDb } from "@/lib/supabase/hub";

const PATH = "/proyectos";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) || t.startsWith("/") ? t : `https://${t}`;
}

// --- Columnas del Kanban ---

export async function createColumn(): Promise<void> {
  await requireMember();
  const { data: last } = await hubDb
    .from("project_columns")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  await hubDb.from("project_columns").insert({ label: "Nueva columna", position });
  revalidatePath(PATH);
}

export async function renameColumn(id: string, label: string): Promise<void> {
  await requireMember();
  const clean = label.trim().slice(0, 40) || "Sin nombre";
  await hubDb.from("project_columns").update({ label: clean }).eq("id", id);
  revalidatePath(PATH);
}

export async function deleteColumn(id: string): Promise<void> {
  await requireMember();
  // on delete set null: los proyectos de la columna quedan "sin columna" (bandeja).
  await hubDb.from("project_columns").delete().eq("id", id);
  revalidatePath(PATH);
}

export async function reorderColumns(ids: string[]): Promise<void> {
  await requireMember();
  await Promise.all(
    ids.map((id, i) => hubDb.from("project_columns").update({ position: i }).eq("id", id)),
  );
  revalidatePath(PATH);
}

// --- Proyectos ---

export async function createProject(columnId: string | null): Promise<string> {
  await requireMember();
  const scope = hubDb.from("projects").select("position");
  const { data: last } = await (columnId
    ? scope.eq("column_id", columnId)
    : scope.is("column_id", null)
  )
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  const { data, error } = await hubDb
    .from("projects")
    .insert({ column_id: columnId, position })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create project failed");
  revalidatePath(PATH);
  return data.id as string;
}

type ProjectPatch = {
  title?: string;
  info?: string;
  health?: ProjectHealth;
  ownerId?: string | null;
  team?: Team | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function updateProject(id: string, patch: ProjectPatch): Promise<void> {
  await requireMember();
  const clean: Record<string, unknown> = {};
  if (typeof patch.title === "string") clean.title = patch.title.trim().slice(0, 120) || "Sin título";
  if (typeof patch.info === "string") clean.info = patch.info.slice(0, 4000);
  if (patch.health && PROJECT_HEALTHS.includes(patch.health)) clean.health = patch.health;
  if ("ownerId" in patch) clean.owner_id = patch.ownerId || null;
  if ("team" in patch) clean.team = patch.team && TEAMS.includes(patch.team) ? patch.team : null;
  if ("startDate" in patch) clean.start_date = patch.startDate || null;
  if ("endDate" in patch) clean.end_date = patch.endDate || null;
  if (Object.keys(clean).length === 0) return;
  await hubDb.from("projects").update(clean).eq("id", id);
  revalidatePath(PATH);
}

export async function deleteProject(id: string): Promise<void> {
  await requireMember();
  await hubDb.from("projects").delete().eq("id", id);
  revalidatePath(PATH);
}

/** Reordena/mueve proyectos: reescribe `column_id` y `position` de cada id recibido. */
export async function moveProjects(columnId: string | null, ids: string[]): Promise<void> {
  await requireMember();
  await Promise.all(
    ids.map((id, i) =>
      hubDb.from("projects").update({ position: i, column_id: columnId }).eq("id", id),
    ),
  );
  revalidatePath(PATH);
}

// --- Checklist ---

export async function addTask(projectId: string, label: string): Promise<void> {
  await requireMember();
  const clean = label.trim().slice(0, 200);
  if (!clean) return;
  const { data: last } = await hubDb
    .from("project_tasks")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  await hubDb.from("project_tasks").insert({ project_id: projectId, label: clean, position });
  revalidatePath(PATH);
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  await requireMember();
  await hubDb.from("project_tasks").update({ done }).eq("id", id);
  revalidatePath(PATH);
}

export async function updateTask(id: string, label: string): Promise<void> {
  await requireMember();
  await hubDb.from("project_tasks").update({ label: label.trim().slice(0, 200) }).eq("id", id);
  revalidatePath(PATH);
}

export async function deleteTask(id: string): Promise<void> {
  await requireMember();
  await hubDb.from("project_tasks").delete().eq("id", id);
  revalidatePath(PATH);
}

export async function reorderTasks(projectId: string, ids: string[]): Promise<void> {
  await requireMember();
  await Promise.all(
    ids.map((id, i) =>
      hubDb.from("project_tasks").update({ position: i }).eq("id", id).eq("project_id", projectId),
    ),
  );
  revalidatePath(PATH);
}

// --- Documentos ---

export async function addDoc(projectId: string, label: string, url: string): Promise<void> {
  await requireMember();
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return;
  const { data: last } = await hubDb
    .from("project_docs")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  await hubDb.from("project_docs").insert({
    project_id: projectId,
    label: label.trim().slice(0, 120) || cleanUrl,
    url: cleanUrl,
    position,
  });
  revalidatePath(PATH);
}

export async function deleteDoc(id: string): Promise<void> {
  await requireMember();
  await hubDb.from("project_docs").delete().eq("id", id);
  revalidatePath(PATH);
}
