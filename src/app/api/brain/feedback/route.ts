import { getMember } from "@/lib/hub";
import { hubDb } from "@/lib/supabase/hub";

export const dynamic = "force-dynamic";

/**
 * POST { queryId, value: 1 | -1, note? } → guarda la valoración (👍/👎) de una respuesta del Brain.
 * Solo se puede valorar una pregunta propia: el UPDATE filtra por member_id.
 */
export async function POST(req: Request) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { queryId?: unknown; value?: unknown; note?: unknown };
  const queryId = typeof body.queryId === "string" ? body.queryId : "";
  const value = body.value === 1 || body.value === -1 ? body.value : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);
  if (!isUuid || value === null) return new Response("Datos no válidos", { status: 400 });

  const { data, error } = await hubDb
    .from("brain_queries")
    .update({ feedback: value, feedback_note: note, feedback_at: new Date().toISOString() })
    .eq("id", queryId)
    .eq("member_id", member.id)
    .select("id");
  if (error) {
    console.error("[brain] feedback", error.message);
    return new Response("Error", { status: 500 });
  }
  if (!data?.length) return new Response("No encontrada", { status: 404 });
  return Response.json({ ok: true });
}
