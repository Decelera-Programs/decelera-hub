import { getMember } from "@/lib/hub";
import { appOrigin, checkState, completeConnection, driveConnectEnabled } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Página mínima de la ventana emergente: avisa al chat y se cierra (o explica el error). */
function page(origin: string, ok: boolean, message: string) {
  const body = `<!doctype html><meta charset="utf-8"><title>Drive</title>
<body style="font-family:system-ui,sans-serif;padding:24px;color:#2D3852;background:#F2F8FA">
<p>${esc(message)}</p>
<script>
  try { if (window.opener) window.opener.postMessage({ type: "drive-connect", ok: ${ok} }, ${JSON.stringify(origin)}); } catch (e) {}
  ${ok ? "setTimeout(function(){ window.close(); }, 600);" : ""}
</script></body>`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "drive_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/google/drive; Max-Age=0",
    },
  });
}

export async function GET(req: Request) {
  const origin = appOrigin(req);
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });
  if (!driveConnectEnabled()) return page(origin, false, "La conexión con Drive no está configurada todavía.");

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return page(origin, false, "No se ha concedido el permiso. Puedes cerrar esta ventana.");

  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)drive_oauth_state=([^;]+)/)?.[1];
  if (!checkState(url.searchParams.get("state"), cookie, member.id)) {
    return page(origin, false, "La solicitud ha caducado o no es válida. Vuelve a intentarlo desde el chat.");
  }
  const code = url.searchParams.get("code");
  if (!code) return page(origin, false, "Google no devolvió ningún código. Vuelve a intentarlo.");

  const r = await completeConnection(req, code, member.id, member.email);
  return r.ok ? page(origin, true, "Drive conectado. Ya puedes cerrar esta ventana.") : page(origin, false, r.reason);
}
