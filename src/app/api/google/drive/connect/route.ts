import { getMember } from "@/lib/hub";
import { appOrigin, authorizeUrl, driveConnectEnabled, makeState } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/** Abre la pantalla de permisos de Google (solo lectura de Drive). Se llama desde una ventana emergente del chat. */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  if (!driveConnectEnabled()) return new Response("La conexión con Drive no está configurada todavía.", { status: 503 });

  const { state, cookie } = makeState(member.id);
  const secure = appOrigin(req).startsWith("https");
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(req, state, member.email),
      "Set-Cookie": `drive_oauth_state=${cookie}; HttpOnly; SameSite=Lax; Path=/api/google/drive; Max-Age=600${secure ? "; Secure" : ""}`,
      "Cache-Control": "no-store",
    },
  });
}
