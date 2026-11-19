import "server-only";
import { hubDb } from "@/lib/supabase/hub";
import type { BrainCard, BrainSource } from "@/lib/brain-shared";
import type { Member } from "@/lib/hub";
import { loadCards } from "@/lib/brain";

/**
 * Historial de conversaciones del Brain: cada persona ve, reabre y borra SOLO las suyas. Todas las consultas
 * filtran por member_id, así que conocer el identificador de otra conversación no sirve de nada.
 */

export type ConversationSummary = { id: string; title: string; lastAt: string; turns: number };

export type StoredTurn = {
  question: string;
  answer: string;
  sources: BrainSource[];
  cards: BrainCard[];
  queryId: string;
};

const LIST_LIMIT = 40;
const SCAN_ROWS = 400;

export async function listConversations(memberId: string): Promise<ConversationSummary[]> {
  const { data } = await hubDb
    .from("brain_queries")
    .select("conversation_id, question, created_at")
    .eq("member_id", memberId)
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(SCAN_ROWS);

  const byId = new Map<string, ConversationSummary>();
  // Las filas llegan de la más nueva a la más antigua: la última que se ve de cada conversación es su primera pregunta.
  for (const r of data ?? []) {
    const id = r.conversation_id as string;
    const q = (r.question as string).replace(/\s+/g, " ").trim();
    const cur = byId.get(id);
    if (!cur) byId.set(id, { id, title: q, lastAt: r.created_at as string, turns: 1 });
    else {
      cur.title = q;
      cur.turns += 1;
    }
  }
  return [...byId.values()]
    .map((c) => ({ ...c, title: c.title.length > 90 ? `${c.title.slice(0, 89)}…` : c.title }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, LIST_LIMIT);
}

type StoredSource = Partial<BrainSource> & { ref?: string; kind?: string; snippet?: string };

/** Turnos de una conversación de esta persona, listos para pintarse (las tarjetas se rehacen con las visibles hoy). */
export async function getConversation(member: Pick<Member, "id" | "role">, conversationId: string): Promise<StoredTurn[]> {
  const { data } = await hubDb
    .from("brain_queries")
    .select("id, question, answer, sources")
    .eq("member_id", member.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(60);
  const rows = data ?? [];
  if (!rows.length) return [];

  const needsCards = rows.some((r) => ((r.sources ?? []) as StoredSource[]).some((s) => s.kind === "Tarjeta"));
  const catalog = needsCards ? await loadCards(member) : [];
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  return rows.map((r) => {
    const stored = ((r.sources ?? []) as StoredSource[]) ?? [];
    const sources = stored.filter((s) => s.name && s.kind !== "Tarjeta" && s.kind !== "Aviso" && s.kind !== "Consulta fallida") as BrainSource[];
    const cards = stored
      .filter((s) => s.kind === "Tarjeta")
      .flatMap((s) => {
        const slug = s.snippet?.match(/\(([^()]+)\)$/)?.[1];
        const card = slug ? bySlug.get(slug) : undefined;
        return card ? [{ ...card, ref: s.ref ?? card.ref }] : [];
      });
    return { question: r.question as string, answer: (r.answer as string | null) ?? "", sources, cards, queryId: r.id as string };
  });
}

export async function deleteConversation(memberId: string, conversationId: string): Promise<void> {
  await hubDb.from("brain_queries").delete().eq("member_id", memberId).eq("conversation_id", conversationId);
}
