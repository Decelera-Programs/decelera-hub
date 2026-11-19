import { getMember } from "@/lib/hub";
import { deleteMemory, listMemories, memorizeConversation } from "@/lib/brain-memory";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET → memorias de la persona que pregunta (solo las suyas). */
export async function GET() {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  return Response.json({ memories: await listMemories(member.id) });
}

/** DELETE ?id=… → borra una memoria propia. */
export async function DELETE(req: Request) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return new Response("Petición no válida", { status: 400 });
  await deleteMemory(member.id, id);
  return Response.json({ ok: true });
}

/** POST { conversationId } → el agente revisa la conversación cerrada. Idempotente; la respuesta no espera a nadie. */
export async function POST(req: Request) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { conversationId?: unknown };
  const id = typeof body.conversationId === "string" ? body.conversationId : "";
  if (!UUID_RE.test(id)) return new Response("Petición no válida", { status: 400 });
  await memorizeConversation(member.id, id);
  return Response.json({ ok: true });
}
