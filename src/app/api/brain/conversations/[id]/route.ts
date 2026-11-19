import { getMember } from "@/lib/hub";
import { deleteConversation, getConversation } from "@/lib/brain-history";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET → los turnos de una conversación propia (vacío si no existe o es de otra persona). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response("Petición no válida", { status: 400 });
  return Response.json({ turns: await getConversation(member, id) });
}

/** DELETE → borra una conversación propia (preguntas, respuestas y valoraciones). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response("Petición no válida", { status: 400 });
  await deleteConversation(member.id, id);
  return Response.json({ ok: true });
}
