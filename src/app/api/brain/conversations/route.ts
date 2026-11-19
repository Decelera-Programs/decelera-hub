import { getMember } from "@/lib/hub";
import { listConversations } from "@/lib/brain-history";

export const dynamic = "force-dynamic";

/** GET → conversaciones de la persona que pregunta (solo las suyas), de la más reciente a la más antigua. */
export async function GET() {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  return Response.json({ conversations: await listConversations(member.id) });
}
