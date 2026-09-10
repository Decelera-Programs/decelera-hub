import "server-only";
import { cache } from "react";
import type {
  Project,
  ProjectColumn,
  ProjectDoc,
  ProjectHealth,
  ProjectOwner,
  ProjectTask,
} from "@/lib/projects";
import type { Team } from "@/lib/teams";
import { hubDb } from "@/lib/supabase/hub";

type ColumnRow = { id: string; label: string; position: number };
type TaskRow = { id: string; label: string; done: boolean; position: number };
type DocRow = { id: string; label: string; url: string; position: number };
type OwnerRow = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type ProjectRow = {
  id: string;
  title: string;
  info: string;
  column_id: string | null;
  position: number;
  health: ProjectHealth;
  owner_id: string | null;
  team: Team | null;
  start_date: string | null;
  end_date: string | null;
  owner: OwnerRow | null;
  project_tasks: TaskRow[] | null;
  project_docs: DocRow[] | null;
};

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export const getProjectColumns = cache(async (): Promise<ProjectColumn[]> => {
  const { data } = await hubDb
    .from("project_columns")
    .select("id, label, position")
    .order("position");
  return ((data ?? []) as ColumnRow[]).map((c) => ({
    id: c.id,
    label: c.label,
    position: c.position,
  }));
});

function toOwner(r: OwnerRow | null): ProjectOwner | null {
  if (!r) return null;
  return { id: r.id, name: r.full_name, email: r.email, avatarUrl: r.avatar_url };
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const { data } = await hubDb
    .from("projects")
    .select(
      `id, title, info, column_id, position, health, owner_id, team, start_date, end_date,
       owner:members!projects_owner_id_fkey(id, full_name, email, avatar_url),
       project_tasks(id, label, done, position),
       project_docs(id, label, url, position)`,
    )
    .order("position");

  return ((data ?? []) as unknown as ProjectRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    info: p.info,
    columnId: p.column_id,
    position: p.position,
    health: p.health,
    ownerId: p.owner_id,
    owner: toOwner(p.owner),
    team: p.team,
    startDate: p.start_date,
    endDate: p.end_date,
    tasks: ((p.project_tasks ?? []) as TaskRow[]).slice().sort(byPos) as ProjectTask[],
    docs: ((p.project_docs ?? []) as DocRow[]).slice().sort(byPos) as ProjectDoc[],
  }));
});

/** Miembros activos, para el selector de "encargado". */
export const getMemberOptions = cache(async (): Promise<ProjectOwner[]> => {
  const { data } = await hubDb
    .from("members")
    .select("id, full_name, email, avatar_url")
    .eq("is_active", true)
    .order("full_name");
  return ((data ?? []) as OwnerRow[]).map((r) => ({
    id: r.id,
    name: r.full_name,
    email: r.email,
    avatarUrl: r.avatar_url,
  }));
});
