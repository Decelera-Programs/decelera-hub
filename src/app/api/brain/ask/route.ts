import { getMember } from "@/lib/hub";
import { streamAnswer } from "@/lib/brain";
import type { BrainEvent } from "@/lib/brain-shared";

export const dynamic = "force-dynamic";

/**
 * POST { question } → respuesta en streaming (NDJSON, un `BrainEvent` por línea).
 * Cualquier miembro activo del hub puede preguntar. Sin sesión válida: 401 (no hay `proxy` global,
 * cada página y cada endpoint se protege solo).
 */
export async function POST(req: Request) {
  const member = await getMember();
  if (!member) return new Response("No autorizado", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question : "";

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, ev: BrainEvent) =>
    controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of streamAnswer(member.id, question, req.signal)) send(controller, ev);
      } catch (e) {
        console.error("[brain] stream", e);
        send(controller, { type: "error", error: "No he podido responder. Prueba de nuevo en un momento." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // que ningún proxy retenga el flujo
    },
  });
}
