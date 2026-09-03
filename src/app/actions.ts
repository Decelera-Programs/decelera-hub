"use server";

import { signOut } from "@/auth";
import { requireMember, type Folder, type Widget, type WidgetKind } from "@/lib/hub";
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
    .select("id, kind, title, data, position")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create widget failed");
  return data as Widget;
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

/** Reordena el espacio personal (carpetas + widgets mezclados) reescribiendo `position` 0..n-1. */
export async function reorderSpace(
  order: { type: "folder" | "widget"; id: string }[],
): Promise<void> {
  const m = await requireMember();
  await Promise.all(
    order.map((o, i) =>
      o.type === "folder"
        ? hubDb.from("folders").update({ position: i }).eq("id", o.id).eq("member_id", m.id)
        : hubDb.from("widgets").update({ position: i }).eq("id", o.id).eq("member_id", m.id),
    ),
  );
}
