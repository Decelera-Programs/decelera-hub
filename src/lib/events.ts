/**
 * Calendario de eventos del equipo (`hub.events`, los escribe el agente `events` del VPS — ver
 * [[project-events-agent-build]]). Tipos y utilidades de fecha compartidas entre el servidor y la vista
 * cliente. Todo se pinta en hora de Madrid, que es donde está el equipo y la zona del calendario de Maru.
 */

export type CalendarPerson = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  url: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  eventTz: string | null;
  source: string | null;
  slackUrl: string | null;
  googleUrl: string | null;
  going: CalendarPerson[];
  notGoing: CalendarPerson[];
  suggested: CalendarPerson[];
};

export const TZ = "Europe/Madrid";

export type View = "mes" | "semana" | "agenda";
export const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "mes", label: "Mes", key: "m" },
  { id: "semana", label: "Semana", key: "w" },
  { id: "agenda", label: "Agenda", key: "a" },
];
export function isView(v: string | undefined): v is View {
  return VIEWS.some((x) => x.id === v);
}

export const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Clave de día `yyyy-mm-dd`. */
export type DayKey = string;

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha/hora de un instante ISO vista desde Madrid. */
export function madrid(iso: string): { day: DayKey; hour: number; minute: number } {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

export function hhmm(iso: string): string {
  const m = madrid(iso);
  return `${String(m.hour).padStart(2, "0")}:${String(m.minute).padStart(2, "0")}`;
}

// Aritmética de días sobre fechas de calendario puras (UTC a medianoche): sin sustos de cambio de hora.
export function keyToDate(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function dateToKey(d: Date): DayKey {
  return d.toISOString().slice(0, 10);
}
export function addDays(key: DayKey, n: number): DayKey {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}
export function addMonths(key: DayKey, n: number): DayKey {
  const d = keyToDate(key);
  return dateToKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}
/** 0 = lunes … 6 = domingo. */
export function weekday(key: DayKey): number {
  return (keyToDate(key).getUTCDay() + 6) % 7;
}
export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekday(key));
}
export function startOfMonth(key: DayKey): DayKey {
  return key.slice(0, 8) + "01";
}
export function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10));
}
export function monthIndex(key: DayKey): number {
  return Number(key.slice(5, 7)) - 1;
}
export function year(key: DayKey): number {
  return Number(key.slice(0, 4));
}

/** Las 6 semanas (42 días) que pinta una vista de mes, empezando en lunes. */
export function monthGrid(anchor: DayKey): DayKey[] {
  const first = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

const dayFmts = new Map<string, Intl.DateTimeFormat>();
/** Día de calendario de un instante en una zona concreta. */
function dayIn(iso: string, tz: string): DayKey {
  let f = dayFmts.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    }
    dayFmts.set(tz, f);
  }
  return f.format(new Date(iso));
}

/** Días que ocupa un evento: uno solo, o varios si dura más de un día. */
export function eventDays(ev: CalendarEvent): DayKey[] {
  if (ev.allDay) {
    // Días de calendario EN LA ZONA DEL EVENTO (Slush 18 nov 00:00 Helsinki son las 23:00 del 17 en Madrid), y
    // ends_at es el último día, inclusive (así lo escribe el agente).
    const tz = ev.eventTz || TZ;
    const first = dayIn(ev.startsAt, tz);
    const last = ev.endsAt ? dayIn(ev.endsAt, tz) : first;
    const out: DayKey[] = [];
    for (let k = first; k <= last && out.length < 31; k = addDays(k, 1)) out.push(k);
    return out.length ? out : [first];
  }
  const start = madrid(ev.startsAt).day;
  let end = ev.endsAt ? madrid(ev.endsAt).day : start;
  // Un evento que termina justo a medianoche no "ocupa" el día siguiente.
  if (ev.endsAt && end > start) {
    const e = madrid(ev.endsAt);
    if (e.hour === 0 && e.minute === 0) end = addDays(end, -1);
  }
  const out: DayKey[] = [];
  for (let k = start; k <= end && out.length < 31; k = addDays(k, 1)) out.push(k);
  return out;
}

export function longDate(key: DayKey): string {
  return `${WEEKDAYS_SHORT[weekday(key)]}, ${dayOfMonth(key)} de ${MONTHS[monthIndex(key)]}`;
}

export function whenLabel(ev: CalendarEvent): string {
  const days = eventDays(ev);
  const first = longDate(days[0]);
  if (ev.allDay) return days.length > 1 ? `${first} – ${longDate(days[days.length - 1])}` : `${first} · todo el día`;
  const start = hhmm(ev.startsAt);
  if (!ev.endsAt) return `${first} · ${start}`;
  if (days.length > 1) return `${first} ${start} – ${longDate(days[days.length - 1])} ${hhmm(ev.endsAt)}`;
  return `${first} · ${start} – ${hhmm(ev.endsAt)}`;
}
