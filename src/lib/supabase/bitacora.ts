import "server-only";
import { cache } from "react";
import type { EntryKind, EntryStatus, LogEntry, ProjectOption } from "@/lib/bitacora";
import type { ProjectOwner } from "@/lib/projects";
import type { Team } from "@/lib/teams";
import { hubDb } from "@/lib/supabase/hub";

type OwnerRow = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type EntryRow = {
  id: string;
  body: string;
  kind: EntryKind;
  status: EntryStatus;
  team: Team | null;
  author_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
  author: OwnerRow | null;
  owner: OwnerRow | null;
  project: { title: string } | null;
};

function toOwner(r: OwnerRow | null): ProjectOwner | null {
  if (!r) return null;
  return { id: r.id, name: r.full_name, email: r.email, avatarUrl: r.avatar_url };
}

export const getLogEntries = cache(async (): Promise<LogEntry[]> => {
  const { data, error } = await hubDb
    .from("log_entries")
    .select(
      `id, body, kind, status, team, author_id, owner_id, due_date, project_id, created_at,
       author:members!log_entries_author_id_fkey(id, full_name, email, avatar_url),
       owner:members!log_entries_owner_id_fkey(id, full_name, email, avatar_url),
       project:projects!log_entries_project_id_fkey(title)`,
    )
    .order("created_at", { ascending: false })
    .limit(500);
  // No tragarnos el error: una lectura fallida no debe verse como "bitácora vacía".
  if (error) throw new Error(`getLogEntries: ${error.message}`);
  return ((data ?? []) as unknown as EntryRow[]).map((r) => ({
    id: r.id,
    body: r.body,
    kind: r.kind,
    status: r.status,
    team: r.team,
    authorId: r.author_id,
    author: toOwner(r.author),
    ownerId: r.owner_id,
    owner: toOwner(r.owner),
    dueDate: r.due_date,
    projectId: r.project_id,
    projectTitle: r.project?.title ?? null,
    createdAt: r.created_at,
  }));
});

/** Proyectos (id + título) para el selector "Añadir a un proyecto". */
export const getProjectOptions = cache(async (): Promise<ProjectOption[]> => {
  const { data, error } = await hubDb.from("projects").select("id, title").order("title");
  if (error) throw new Error(`getProjectOptions: ${error.message}`);
  return (data ?? []) as ProjectOption[];
});
