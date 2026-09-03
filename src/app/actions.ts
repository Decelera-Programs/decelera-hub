"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import type { AppCategory, AppStatus, HubApp, Section } from "@/lib/apps";
import {
  requireAdmin,
  requireMember,
  rowToWidget,
  type Folder,
  type Widget,
  type WidgetKind,
} from "@/lib/hub";
import { hubDb } from "@/lib/supabase/hub";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// --- Espacio personal ---
// Ordenación monótona: posición nueva = epoch en segundos (cabe en int, siempre al final).
const nextPos = () => Math.floor(Date.now() / 1000);

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function assertOwnsFolder(memberId: string, folderId: string) {
  const { data } = await hubDb
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!data) throw new Error("folder not found");
}

export async function createFolder(): Promise<Folder> {
  const m = await requireMember();
  const { data, error } = await hubDb
    .from("folders")
    .insert({ member_id: m.id, name: "Nueva carpeta", position: nextPos() })
    .select("id, name, color, position")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create folder failed");
  return { id: data.id, name: data.name, color: data.color ?? null, position: data.position, items: [] };
}

export async function updateFolder(
  id: string,
  patch: { name?: string; color?: string | null },
): Promise<void> {
  const m = await requireMember();
  const clean: Record<string, unknown> = {};
  if (typeof patch.name === "string") clean.name = patch.name.trim().slice(0, 60) || "Sin nombre";
  if ("color" in patch) clean.color = patch.color;
  if (Object.keys(clean).length === 0) return;
  await hubDb.from("folders").update(clean).eq("id", id).eq("member_id", m.id);
}

export async function deleteFolder(id: string): Promise<void> {
  const m = await requireMember();
  await hubDb.from("folders").delete().eq("id", id).eq("member_id", m.id);
}

export async function addFolderItem(
  folderId: string,
  item: { kind: "app"; appSlug: string } | { kind: "link"; url: string; label: string },
): Promise<FolderItemRow> {
  const m = await requireMember();
  await assertOwnsFolder(m.id, folderId);
  const row: {
    folder_id: string;
    kind: "app" | "link";
    app_slug: string | null;
    url: string | null;
    label: string | null;
    position: number;
  } =
    item.kind === "app"
      ? { folder_id: folderId, kind: "app", app_slug: item.appSlug, url: null, label: null, position: nextPos() }
      : {
          folder_id: folderId,
          kind: "link",
          app_slug: null,
          url: normalizeUrl(item.url),
          label: item.label.trim().slice(0, 80) || normalizeUrl(item.url),
          position: nextPos(),
        };
  const { data, error } = await hubDb
    .from("folder_items")
    .insert(row)
    .select("id, kind, app_slug, url, label, position")
    .single();
  if (error || !data) throw new Error(error?.message ?? "add item failed");
  return data as FolderItemRow;
}

type FolderItemRow = {
  id: string;
  kind: "app" | "link";
  app_slug: string | null;
  url: string | null;
  label: string | null;
  position: number;
};

export async function reorderFolderItems(folderId: string, orderedIds: string[]): Promise<void> {
  const m = await requireMember();
  await assertOwnsFolder(m.id, folderId);
  await Promise.all(
    orderedIds.map((id, i) =>
      hubDb.from("folder_items").update({ position: i }).eq("id", id).eq("folder_id", folderId),
    ),
  );
}

export async function removeFolderItem(itemId: string): Promise<void> {
  const m = await requireMember();
  const { data } = await hubDb
    .from("folder_items")
    .select("folder_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!data) return;
  await assertOwnsFolder(m.id, data.folder_id);
  await hubDb.from("folder_items").delete().eq("id", itemId);
}

const WIDGET_DEFAULTS: Record<WidgetKind, { title: string; data: Record<string, unknown> }> = {
  note: { title: "Nota", data: { text: "" } },
  links: { title: "Enlaces", data: { items: [] } },
  todo: { title: "Tareas", data: { items: [] } },
};

export async function createWidget(kind: WidgetKind): Promise<Widget> {
  const m = await requireMember();
  const d = WIDGET_DEFAULTS[kind];
  const { data, error } = await hubDb
    .from("widgets")
    .insert({ member_id: m.id, kind, title: d.title, data: d.data, position: nextPos() })
    .select("id, kind, title, data, position, stack_order")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create widget failed");
  return rowToWidget(data);
}

export async function updateWidget(
  id: string,
  patch: { title?: string; data?: unknown },
): Promise<void> {
  const m = await requireMember();
  const clean: Record<string, unknown> = {};
  if (typeof patch.title === "string") clean.title = patch.title.trim().slice(0, 60);
  if ("data" in patch) clean.data = patch.data;
  if (Object.keys(clean).length === 0) return;
  await hubDb.from("widgets").update(clean).eq("id", id).eq("member_id", m.id);
}

export async function deleteWidget(id: string): Promise<void> {
  const m = await requireMember();
  await hubDb.from("widgets").delete().eq("id", id).eq("member_id", m.id);
}

/**
 * Persiste el layout de "Tu espacio". Cada carpeta/widget guarda su celda de la rejilla
 * en `position` (colocación libre: puede haber huecos, no es 0..n-1).
 */
export async function saveSpaceLayout(
  items: { type: "folder" | "widget"; id: string; cell: number }[],
): Promise<void> {
  const m = await requireMember();
  const jobs: PromiseLike<unknown>[] = items.map((it) =>
    hubDb
      .from(it.type === "folder" ? "folders" : "widgets")
      .update({ position: it.cell })
      .eq("id", it.id)
      .eq("member_id", m.id),
  );
  await Promise.all(jobs);
}

// --- Secciones y tarjetas del hub (solo admin) ---

const SECTION_COLS = "id, label, blurb, accent, position";
const CARD_COLS =
  "id, slug, section_id, initial, title, description, href, category, status, meta, external, position";

type CardInput = {
  title: string;
  description: string;
  href: string;
  initial: string;
  category: AppCategory;
  status: AppStatus;
  meta: string;
  external: boolean;
};

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "card"
  );
}

function toSection(r: Record<string, unknown>): Section {
  return {
    id: r.id as string,
    label: r.label as string,
    blurb: (r.blurb as string | null) ?? "",
    accent: (r.accent as string | null) ?? "var(--brand-water)",
    position: r.position as number,
  };
}

function toCard(r: Record<string, unknown>): HubApp {
  return {
    id: r.id as string,
    slug: r.slug as string,
    sectionId: (r.section_id as string | null) ?? null,
    initial: (r.initial as string | null) ?? "",
    title: r.title as string,
    description: (r.description as string | null) ?? "",
    href: r.href as string,
    category: r.category as AppCategory,
    status: r.status as AppStatus,
    meta: (r.meta as string | null) ?? undefined,
    external: Boolean(r.external),
    position: r.position as number,
  };
}

function cleanCard(input: CardInput) {
  const href = input.href.trim();
  return {
    title: input.title.trim().slice(0, 80) || "Sin título",
    description: input.description.trim().slice(0, 240),
    href: href || "#",
    initial: input.initial.trim().slice(0, 3).toUpperCase(),
    category: input.category,
    status: input.status,
    meta: input.meta.trim().slice(0, 40) || null,
    external: input.external,
  };
}

export async function createSection(): Promise<Section> {
  await requireAdmin();
  const { data: last } = await hubDb
    .from("sections")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  const { data, error } = await hubDb
    .from("sections")
    .insert({ label: "Nueva sección", blurb: "", accent: "var(--brand-water)", position })
    .select(SECTION_COLS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "create section failed");
  revalidatePath("/");
  return toSection(data);
}

export async function updateSection(
  id: string,
  patch: { label?: string; blurb?: string; accent?: string },
): Promise<void> {
  await requireAdmin();
  const clean: Record<string, unknown> = {};
  if (typeof patch.label === "string") clean.label = patch.label.trim().slice(0, 60) || "Sin nombre";
  if (typeof patch.blurb === "string") clean.blurb = patch.blurb.trim().slice(0, 160);
  if (typeof patch.accent === "string") clean.accent = patch.accent;
  if (Object.keys(clean).length === 0) return;
  await hubDb.from("sections").update(clean).eq("id", id);
  revalidatePath("/");
}

export async function deleteSection(id: string): Promise<void> {
  await requireAdmin();
  await hubDb.from("sections").delete().eq("id", id); // las tarjetas caen en cascada
  revalidatePath("/");
}

export async function reorderSections(ids: string[]): Promise<void> {
  await requireAdmin();
  await Promise.all(
    ids.map((id, i) => hubDb.from("sections").update({ position: i }).eq("id", id)),
  );
  revalidatePath("/");
}

export async function createCard(sectionId: string, input: CardInput): Promise<HubApp> {
  await requireAdmin();
  const { data: last } = await hubDb
    .from("cards")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;
  const c = cleanCard(input);
  const slug = `${slugify(c.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await hubDb
    .from("cards")
    .insert({ ...c, slug, section_id: sectionId, position })
    .select(CARD_COLS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "create card failed");
  revalidatePath("/");
  return toCard(data);
}

export async function updateCard(
  id: string,
  patch: Partial<CardInput> & { sectionId?: string },
): Promise<void> {
  await requireAdmin();
  const clean: Record<string, unknown> = {};
  if (typeof patch.title === "string") clean.title = patch.title.trim().slice(0, 80) || "Sin título";
  if (typeof patch.description === "string")
    clean.description = patch.description.trim().slice(0, 240);
  if (typeof patch.href === "string") clean.href = patch.href.trim() || "#";
  if (typeof patch.initial === "string") clean.initial = patch.initial.trim().slice(0, 3).toUpperCase();
  if (patch.category) clean.category = patch.category;
  if (patch.status) clean.status = patch.status;
  if (typeof patch.meta === "string") clean.meta = patch.meta.trim().slice(0, 40) || null;
  if (typeof patch.external === "boolean") clean.external = patch.external;
  if (typeof patch.sectionId === "string") clean.section_id = patch.sectionId;
  if (Object.keys(clean).length === 0) return;
  await hubDb.from("cards").update(clean).eq("id", id);
  revalidatePath("/");
}

export async function deleteCard(id: string): Promise<void> {
  await requireAdmin();
  await hubDb.from("cards").delete().eq("id", id);
  revalidatePath("/");
}

export async function reorderCards(sectionId: string, cardIds: string[]): Promise<void> {
  await requireAdmin();
  await Promise.all(
    cardIds.map((id, i) =>
      hubDb.from("cards").update({ position: i, section_id: sectionId }).eq("id", id),
    ),
  );
  revalidatePath("/");
}
