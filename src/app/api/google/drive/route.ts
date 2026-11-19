import { getMember } from "@/lib/hub";
import { disconnect, driveConnectEnabled, isConnected } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/** GET → estado de la conexión de Drive de quien pregunta. */
export async function GET() {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  return Response.json({ enabled: driveConnectEnabled(), connected: driveConnectEnabled() ? await isConnected(member.id) : false });
}

/** DELETE → desconecta el Drive: revoca el permiso en Google y borra el token. */
export async function DELETE() {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  await disconnect(member.id);
  return Response.json({ ok: true });
}
