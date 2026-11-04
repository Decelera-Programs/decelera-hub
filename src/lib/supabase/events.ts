import "server-only";
import type { CalendarEvent, CalendarPerson } from "@/lib/events";
import { hubDb } from "./hub";

const CALENDAR_OWNER = "maru@decelerastartups.com"; // calendario donde el agente crea los eventos

type EventRow = {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  url: string | null;
  source_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean | null;
  event_tz: string | null;
  source: string | null;
  slack_channel: string | null;
  slack_ts: string | null;
  google_event_id: string | null;
};

type AttendeeRow = { event_id: string; member_id: string; suggested: boolean | null; response: string | null };
type MemberRow = { id: string; email: string; full_name: string | null; avatar_url: string | null };

function slackUrl(r: EventRow): string | null {
  if (!r.slack_channel || !r.slack_ts) return null;
  return `https://slack.com/archives/${r.slack_channel}/p${r.slack_ts.replace(".", "")}`;
}

/** Enlace de Google Calendar a partir del id del evento (eid = base64(id + " " + calendario)). */
function googleUrl(r: EventRow): string | null {
  if (!r.google_event_id) return null;
  const eid = Buffer.from(`${r.google_event_id} ${CALENDAR_OWNER}`).toString("base64").replace(/=+$/, "");
  return `https://www.google.com/calendar/event?eid=${eid}`;
}

/** Eventos publicados (los descartados/retirados no salen en el calendario) con quién va y sugeridos. */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const { data: rows, error } = await hubDb
    .from("events")
    .select(
      "id, title, description, location, url, source_url, starts_at, ends_at, all_day, event_tz, source, slack_channel, slack_ts, google_event_id",
    )
    .eq("status", "publicado")
    .not("starts_at", "is", null)
    .order("starts_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(`hub.events: ${error.message}`);
  const events = (rows ?? []) as EventRow[];
  if (events.length === 0) return [];

  const { data: att, error: attErr } = await hubDb
    .from("event_attendees")
    .select("event_id, member_id, suggested, response")
    .in(
      "event_id",
      events.map((e) => e.id),
    );
  if (attErr) throw new Error(`hub.event_attendees: ${attErr.message}`);
  const attendees = (att ?? []) as AttendeeRow[];

  const memberIds = [...new Set(attendees.map((a) => a.member_id))];
  const people = new Map<string, CalendarPerson>();
  if (memberIds.length > 0) {
    const { data: mem } = await hubDb.from("members").select("id, email, full_name, avatar_url").in("id", memberIds);
    for (const m of (mem ?? []) as MemberRow[]) {
      people.set(m.id, { id: m.id, email: m.email, name: m.full_name, avatarUrl: m.avatar_url });
    }
  }

  return events.map((r) => {
    const mine = attendees.filter((a) => a.event_id === r.id);
    const pick = (f: (a: AttendeeRow) => boolean) =>
      mine.filter(f).flatMap((a) => (people.has(a.member_id) ? [people.get(a.member_id)!] : []));
    return {
      id: r.id,
      title: r.title || "Evento",
      description: r.description,
      location: r.location,
      url: r.url || r.source_url,
      startsAt: r.starts_at!,
      endsAt: r.ends_at,
      allDay: Boolean(r.all_day),
      eventTz: r.event_tz,
      source: r.source,
      slackUrl: slackUrl(r),
      googleUrl: googleUrl(r),
      going: pick((a) => a.response === "voy"),
      notGoing: pick((a) => a.response === "no_voy"),
      suggested: pick((a) => Boolean(a.suggested) && a.response !== "voy" && a.response !== "no_voy"),
    };
  });
}
