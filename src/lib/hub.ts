import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hubDb } from "@/lib/supabase/hub";

export type Member = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "member" | "admin";
  is_active: boolean;
};

/**
 * Miembro correspondiente a la sesión actual, o `null` si no hay sesión / el email no está en
 * `hub.members` / está desactivado. `cache()` deduplica dentro de un mismo render.
 */
export const getMember = cache(async (): Promise<Member | null> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const { data } = await hubDb
    .from("members")
    .select("id, email, full_name, avatar_url, role, is_active")
    .eq("email", email)
    .maybeSingle();

  return data && data.is_active ? (data as Member) : null;
});

/** Como `getMember` pero redirige: a `/login` si no hay sesión, a `/no-access` si no es miembro activo. */
export async function requireMember(): Promise<Member> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const member = await getMember();
  if (!member) redirect("/no-access");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/no-access");
  return member;
}

// --- Espacio personal (carpetas + widgets, por miembro) ---

export type FolderItem = {
  id: string;
  kind: "app" | "link";
  app_slug: string | null;
  url: string | null;
  label: string | null;
  position: number;
};

export type Folder = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  items: FolderItem[];
};

export type WidgetKind = "note" | "links" | "todo";

export type Widget = {
  id: string;
  kind: WidgetKind;
  title: string | null;
  data: Record<string, unknown>;
  position: number;
};

export const getFolders = cache(async (memberId: string): Promise<Folder[]> => {
  const { data } = await hubDb
    .from("folders")
    .select("id, name, color, position, folder_items(id, kind, app_slug, url, label, position)")
    .eq("member_id", memberId)
    .order("position");

  return (data ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    color: (f.color as string | null) ?? null,
    position: f.position as number,
    items: ((f.folder_items ?? []) as FolderItem[])
      .slice()
      .sort((a, b) => a.position - b.position),
  }));
});

export const getWidgets = cache(async (memberId: string): Promise<Widget[]> => {
  const { data } = await hubDb
    .from("widgets")
    .select("id, kind, title, data, position")
    .eq("member_id", memberId)
    .order("position");
  return (data ?? []) as Widget[];
});
