"use server";

import { requireMember } from "@/lib/hub";
import { hubDb } from "@/lib/supabase/hub";

/**
 * Voy / No voy desde el Brain. Solo escribe `hub.event_attendees` con `responded_via = 'brain'`; el
 * agente `events` del VPS (sync-attendance.py, cada minuto) lo aplica igual que un clic en #events:
 * añade o quita la invitación de Google Calendar y actualiza el mensaje de Slack. El hub no tiene (ni
 * debe tener) credenciales de Calendar ni de Slack.
 */
export async function setRsvp(eventId: string, response: "voy" | "no_voy"): Promise<void> {
  const member = await requireMember();
  if (response !== "voy" && response !== "no_voy") throw new Error("respuesta no válida");

  const { data: ev, error } = await hubDb
    .from("events")
    .select("id, status, starts_at, ends_at")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !ev) throw new Error("evento no encontrado");
  if (ev.status !== "publicado") throw new Error("el evento ya no está publicado");
  const end = ev.ends_at ?? ev.starts_at;
  if (end && new Date(end).getTime() < Date.now()) throw new Error("el evento ya pasó");

  const { error: upErr } = await hubDb.from("event_attendees").upsert(
    {
      event_id: eventId,
      member_id: member.id,
      response,
      responded_via: "brain",
      responded_at: new Date().toISOString(),
    },
    { onConflict: "event_id,member_id" },
  );
  if (upErr) throw new Error(upErr.message);
}
