/** Tipos compartidos de la Bitácora (`hub.log_entries`). */
import type { Team } from "@/lib/teams";
import type { ProjectOwner } from "@/lib/projects";

export type EntryKind = "idea" | "task" | "note";
export const ENTRY_KINDS: EntryKind[] = ["idea", "task", "note"];
export const KIND_LABEL: Record<EntryKind, string> = { idea: "Idea", task: "Tarea", note: "Nota" };
export const KIND_GLYPH: Record<EntryKind, string> = { idea: "✦", task: "◉", note: "¶" };

/** Colores de marca por tipo: Sun, Sea y Water. */
export const KIND_ACCENT: Record<EntryKind, string> = {
  idea: "var(--brand-sun)",
  task: "var(--brand-sea)",
  note: "var(--brand-water)",
};
/** Variante legible para texto (mezcla con el color de texto del tema). */
export const KIND_INK: Record<EntryKind, string> = {
  idea: "color-mix(in srgb, var(--brand-sun) 55%, var(--text-primary))",
  task: "var(--brand-sea)",
  note: "color-mix(in srgb, var(--brand-water) 55%, var(--text-primary))",
};

export type EntryStatus = "open" | "done" | "promoted" | "discarded";
export const ENTRY_STATUSES: EntryStatus[] = ["open", "done", "promoted", "discarded"];
export const STATUS_LABEL: Record<EntryStatus, string> = {
  open: "Abierta",
  done: "Hecha",
  promoted: "Promovida",
  discarded: "Descartada",
};

export type LogEntry = {
  id: string;
  body: string;
  kind: EntryKind;
  status: EntryStatus;
  team: Team | null;
  authorId: string | null;
  author: ProjectOwner | null;
  ownerId: string | null;
  owner: ProjectOwner | null;
  dueDate: string | null;
  projectId: string | null;
  projectTitle: string | null;
  createdAt: string;
};

export type ProjectOption = { id: string; title: string };
