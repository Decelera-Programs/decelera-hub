import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AppCategory, AppStatus, HubApp, Section, Subfolder } from "@/lib/apps";
import type { Team } from "@/lib/teams";
import { hubDb } from "@/lib/supabase/hub";

export type Member = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "member" | "admin";
  is_active: boolean;
  /** Equipos a los que pertenece (solo etiquetar/filtrar). */
  teams: Team[];
};

/**
 * Bypass SOLO para desarrollo local: si `HUB_DEV_EMAIL` está definido y no estamos en
 * producción, el hub trata al visitante como ese miembro de `hub.members` sin pasar por
 * Google (el login OAuth no funciona en local porque las credenciales reales viven en
 * Railway). En Railway `NODE_ENV === "production"`, así que esto queda inerte.
 */
const DEV_EMAIL =
  process.env.NODE_ENV !== "production"
    ? process.env.HUB_DEV_EMAIL?.trim().toLowerCase() || undefined
    : undefined;

/** Email del visitante: el del bypass de dev si aplica, si no el de la sesión NextAuth. */
async function sessionEmail(): Promise<string | undefined> {
  if (DEV_EMAIL) return DEV_EMAIL;
  const session = await auth();
  return session?.user?.email?.toLowerCase();
}

/**
 * Miembro correspondiente a la sesión actual, o `null` si no hay sesión / el email no está en
 * `hub.members` / está desactivado. `cache()` deduplica dentro de un mismo render.
 */
export const getMember = cache(async (): Promise<Member | null> => {
  const email = await sessionEmail();
  if (!email) return null;

  const { data } = await hubDb
    .from("members")
    .select("id, email, full_name, avatar_url, role, is_active, member_teams(team)")
    .eq("email", email)
    .maybeSingle();

  if (!data || !data.is_active) return null;
  const teams = ((data.member_teams ?? []) as { team: Team }[]).map((r) => r.team);
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    role: data.role,
    is_active: data.is_active,
    teams,
  };
});

/** Como `getMember` pero redirige: a `/login` si no hay sesión, a `/no-access` si no es miembro activo. */
export async function requireMember(): Promise<Member> {
  const email = await sessionEmail();
  if (!email) redirect("/login");
  const member = await getMember();
  if (!member) redirect("/no-access");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/no-access");
  return member;
}

// --- Secciones y tarjetas del hub (compartidas: las ve todo el equipo) ---

type SectionRow = { id: string; label: string; blurb: string | null; accent: string | null; position: number };
type SubfolderRow = { id: string; section_id: string; label: string; position: number };
type CardRow = {
  id: string;
  slug: string;
  section_id: string | null;
  subfolder_id: string | null;
  initial: string | null;
  title: string;
  description: string | null;
  href: string;
  category: AppCategory;
  status: AppStatus;
  meta: string | null;
  external: boolean;
  embeddable: boolean;
  position: number;
};

export const getSections = cache(async (): Promise<Section[]> => {
  const { data } = await hubDb
    .from("sections")
    .select("id, label, blurb, accent, position")
    .order("position");
  return ((data ?? []) as SectionRow[]).map((s) => ({
    id: s.id,
    label: s.label,
    blurb: s.blurb ?? "",
    accent: s.accent ?? "var(--brand-water)",
    position: s.position,
  }));
});

export const getSubfolders = cache(async (): Promise<Subfolder[]> => {
  const { data } = await hubDb
    .from("subfolders")
    .select("id, section_id, label, position")
    .order("position");
  return ((data ?? []) as SubfolderRow[]).map((s) => ({
    id: s.id,
    sectionId: s.section_id,
    label: s.label,
    position: s.position,
  }));
});

export const getCards = cache(async (): Promise<HubApp[]> => {
  const { data } = await hubDb
    .from("cards")
    .select(
      "id, slug, section_id, subfolder_id, initial, title, description, href, category, status, meta, external, embeddable, position",
    )
    .order("position");
  return ((data ?? []) as CardRow[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    sectionId: c.section_id,
    subfolderId: c.subfolder_id,
    initial: c.initial ?? "",
    title: c.title,
    description: c.description ?? "",
    href: c.href,
    category: c.category,
    status: c.status,
    meta: c.meta ?? undefined,
    external: c.external,
    embeddable: c.embeddable,
    position: c.position,
  }));
});

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
  /** Ranura en la rejilla de "Tu espacio". Varios widgets con la misma `position` = una pila vertical. */
  position: number;
  /** Orden dentro de la pila (0 si el widget va suelto). */
  stackOrder: number;
};

type WidgetRow = {
  id: string;
  kind: WidgetKind;
  title: string | null;
  data: Record<string, unknown> | null;
  position: number;
  stack_order: number;
};

export function rowToWidget(r: WidgetRow): Widget {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    data: r.data ?? {},
    position: r.position,
    stackOrder: r.stack_order,
  };
}

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
    .select("id, kind, title, data, position, stack_order")
    .eq("member_id", memberId)
    .order("position")
    .order("stack_order");
  return ((data ?? []) as WidgetRow[]).map(rowToWidget);
});
