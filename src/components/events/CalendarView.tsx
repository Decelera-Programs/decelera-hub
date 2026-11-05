"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { setRsvp } from "@/app/calendario/actions";
import {
  addDays,
  addMonths,
  dayOfMonth,
  eventDays,
  hhmm,
  longDate,
  madrid,
  monthGrid,
  monthIndex,
  MONTHS,
  startOfMonth,
  startOfWeek,
  weekday,
  WEEKDAYS_SHORT,
  whenLabel,
  year,
  type CalendarEvent,
  type CalendarPerson,
  type DayKey,
  type View,
  VIEWS,
} from "@/lib/events";

/**
 * Calendario de eventos del equipo, con la forma de Google Calendar (mes / semana / agenda, "Hoy" y
 * flechas, mini-calendario a la izquierda) y el estilo del Brain (tarjetas de cristal, acento sea,
 * números en círculo para hoy). Voy / No voy se puede responder aquí (setRsvp → hub.event_attendees, y el
 * agente del VPS manda la invitación de Calendar y actualiza #events en ~1 min) o en el propio #events.
 *
 * Un evento al que vas se pinta relleno (como un evento aceptado en Google); el resto, en tono suave.
 */


const HOUR_PX = 48;
const ACCENT = "var(--brand-sea)";

function isGoing(ev: CalendarEvent, me: string) {
  return ev.going.some((p) => p.email.toLowerCase() === me.toLowerCase());
}

function chipStyle(going: boolean, past: boolean): React.CSSProperties {
  return {
    background: going ? ACCENT : `color-mix(in srgb, ${ACCENT} 13%, var(--surface-1))`,
    color: going ? "#fff" : "var(--text-primary)",
    opacity: past ? 0.55 : 1,
  };
}

/** El evento con `me` movido a la lista que toca según su respuesta (actualización optimista). */
function withAnswer(ev: CalendarEvent, me: CalendarPerson, response: "voy" | "no_voy"): CalendarEvent {
  const notMe = (l: CalendarPerson[]) => l.filter((p) => p.id !== me.id);
  return {
    ...ev,
    going: response === "voy" ? [...notMe(ev.going), me] : notMe(ev.going),
    notGoing: response === "no_voy" ? [...notMe(ev.notGoing), me] : notMe(ev.notGoing),
    suggested: notMe(ev.suggested),
  };
}

export function CalendarView({
  events: initialEvents,
  today,
  me,
  initialView = "mes",
}: {
  events: CalendarEvent[];
  today: DayKey;
  me: CalendarPerson;
  initialView?: View;
}) {
  const meEmail = me.email;
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [anchor, setAnchor] = useState<DayKey>(today);
  const [openId, setOpenId] = useState<string | null>(null);
  const [local, setLocal] = useState(initialEvents);
  const [lastProp, setLastProp] = useState(initialEvents);
  if (initialEvents !== lastProp) {
    // Datos nuevos del servidor (router.refresh): mandan sobre lo optimista.
    setLastProp(initialEvents);
    setLocal(initialEvents);
  }
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const events = useMemo(() => [...local].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [local]);
  const open = openId ? (events.find((e) => e.id === openId) ?? null) : null;
  const setOpen = (ev: CalendarEvent | null) => {
    setRsvpError(null);
    setOpenId(ev?.id ?? null);
  };

  function answer(ev: CalendarEvent, response: "voy" | "no_voy") {
    const before = local;
    setRsvpError(null);
    setLocal((l) => l.map((e) => (e.id === ev.id ? withAnswer(e, me, response) : e)));
    startSaving(async () => {
      try {
        await setRsvp(ev.id, response);
      } catch (err) {
        setLocal(before);
        setRsvpError(err instanceof Error ? err.message : "No se pudo guardar");
        router.refresh();
      }
    });
  }

  // Índice día → eventos (un evento de varios días aparece en cada uno).
  const byDay = useMemo(() => {
    const m = new Map<DayKey, CalendarEvent[]>();
    for (const ev of events) {
      for (const d of eventDays(ev)) {
        if (!m.has(d)) m.set(d, []);
        m.get(d)!.push(ev);
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startsAt.localeCompare(b.startsAt));
    }
    return m;
  }, [events]);

  function step(dir: 1 | -1) {
    setAnchor((a) => (view === "mes" ? addMonths(a, dir) : addDays(a, 7 * dir)));
  }

  // Atajos de Google Calendar: t (hoy), j/k o flechas (adelante/atrás), m/w/a (vista).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (open || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "t") setAnchor(today);
      else if (e.key === "j" || e.key === "ArrowRight") step(1);
      else if (e.key === "k" || e.key === "ArrowLeft") step(-1);
      else {
        const v = VIEWS.find((x) => x.key === e.key);
        if (v) setView(v.id);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const title =
    view === "semana"
      ? weekTitle(startOfWeek(anchor))
      : `${MONTHS[monthIndex(anchor)]} ${year(anchor)}`;

  const upcoming = events.filter((ev) => eventDays(ev).at(-1)! >= today).slice(0, 6);

  return (
    <div className="cal mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 gap-5 px-3 py-4 sm:px-5 lg:px-6">
      {/* --- Lateral: mini-calendario + próximos --- */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto lg:flex">
        <MiniMonth anchor={anchor} today={today} byDay={byDay} onPick={(d) => setAnchor(d)} />
        <div className="card flex flex-col gap-1 p-3">
          <h3 className="px-1 pb-1 text-sm font-semibold text-[var(--text-primary)]">Próximos</h3>
          {upcoming.length === 0 && (
            <p className="px-1 pb-1 text-xs text-[var(--text-muted)]">
              Nada a la vista. Reenvía un evento a events@decelera.com y aparecerá aquí.
            </p>
          )}
          {upcoming.map((ev) => {
            const d = eventDays(ev)[0];
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setOpen(ev)}
                className="flex items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--row-hover)]"
              >
                <span
                  className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl leading-none"
                  style={{ background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT }}
                >
                  <span className="text-[9px] font-bold uppercase">{MONTHS[monthIndex(d)].slice(0, 3)}</span>
                  <span className="text-base font-bold">{dayOfMonth(d)}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{ev.title}</span>
                  <span className="truncate text-[11px] text-[var(--text-muted)]">
                    {ev.allDay ? "Todo el día" : hhmm(ev.startsAt)}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </span>
                </span>
                {ev.going.length > 0 && (
                  <span className="ml-auto">
                    <AvatarStack people={ev.going} size={18} max={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5 px-2 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded" style={chipStyle(true, false)} /> Vas
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded" style={chipStyle(false, false)} /> Sin respuesta tuya
          </span>
          <span className="pt-1">Pincha un evento para decir si vas.</span>
        </div>
      </aside>

      {/* --- Principal --- */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(today)}
            title="Hoy (t)"
            className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--row-hover)]"
          >
            Hoy
          </button>
          <div className="flex items-center">
            <IconButton label="Anterior (k)" onClick={() => step(-1)}>
              <path d="M15 6l-6 6 6 6" />
            </IconButton>
            <IconButton label="Siguiente (j)" onClick={() => step(1)}>
              <path d="M9 6l6 6-6 6" />
            </IconButton>
          </div>
          <h1 className="page-title text-xl capitalize tracking-tight text-[var(--text-primary)] sm:text-2xl">{title}</h1>
          <div
            role="tablist"
            className="ml-auto flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-0.5 shadow-sm"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                title={`${v.label} (${v.key})`}
                onClick={() => setView(v.id)}
                className="rounded-full px-3.5 py-1 text-sm font-semibold transition-colors"
                style={
                  view === v.id
                    ? { background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT }
                    : { color: "var(--text-muted)" }
                }
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div key={`${view}-${view === "mes" ? startOfMonth(anchor) : startOfWeek(anchor)}`} className="hub-reveal flex min-h-0 flex-1 flex-col">
          {view === "mes" && (
            <MonthView
              anchor={anchor}
              today={today}
              byDay={byDay}
              me={meEmail}
              onOpen={setOpen}
              onMore={(d) => {
                setAnchor(d);
                setView("semana");
              }}
            />
          )}
          {view === "semana" && <WeekView anchor={anchor} today={today} byDay={byDay} me={meEmail} onOpen={setOpen} />}
          {view === "agenda" && <AgendaView events={events} from={anchor} today={today} me={meEmail} onOpen={setOpen} />}
        </div>
      </section>

      {open && (
        <EventDialog
          ev={open}
          today={today}
          me={meEmail}
          saving={saving}
          error={rsvpError}
          onAnswer={(r) => answer(open, r)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function weekTitle(monday: DayKey): string {
  const sunday = addDays(monday, 6);
  if (monthIndex(monday) === monthIndex(sunday)) return `${MONTHS[monthIndex(monday)]} ${year(monday)}`;
  const a = MONTHS[monthIndex(monday)].slice(0, 3);
  const b = MONTHS[monthIndex(sunday)].slice(0, 3);
  return year(monday) === year(sunday) ? `${a} – ${b} ${year(sunday)}` : `${a} ${year(monday)} – ${b} ${year(sunday)}`;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function DayNumber({ day, today, size = 26, muted = false }: { day: DayKey; today: DayKey; size?: number; muted?: boolean }) {
  const isToday = day === today;
  return (
    <span
      className="grid place-items-center rounded-full font-semibold tabular-nums"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        background: isToday ? ACCENT : "transparent",
        color: isToday ? "#fff" : muted ? "var(--text-muted)" : "var(--text-primary)",
        boxShadow: isToday ? `0 6px 16px -6px color-mix(in srgb, ${ACCENT} 70%, transparent)` : undefined,
      }}
    >
      {dayOfMonth(day)}
    </span>
  );
}

// --- Mini-calendario (lateral) ---
function MiniMonth({
  anchor,
  today,
  byDay,
  onPick,
}: {
  anchor: DayKey;
  today: DayKey;
  byDay: Map<DayKey, CalendarEvent[]>;
  onPick: (d: DayKey) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(anchor));
  const [lastAnchor, setLastAnchor] = useState(anchor);
  if (anchor !== lastAnchor) {
    // Seguir al calendario principal cuando cambia (patrón "ajustar estado al cambiar una prop").
    setLastAnchor(anchor);
    setMonth(startOfMonth(anchor));
  }
  const days = monthGrid(month);
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between pb-1 pl-1">
        <span className="text-sm font-semibold capitalize text-[var(--text-primary)]">
          {MONTHS[monthIndex(month)]} {year(month)}
        </span>
        <div className="flex">
          <button type="button" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))} className="grid h-7 w-7 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--row-hover)]">
            ‹
          </button>
          <button type="button" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))} className="grid h-7 w-7 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--row-hover)]">
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="py-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            {w[0]}
          </span>
        ))}
        {days.map((d) => {
          const inMonth = monthIndex(d) === monthIndex(month);
          const has = byDay.has(d);
          const selected = d === anchor && d !== today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className="relative grid h-8 place-items-center rounded-full text-[11px] transition-colors hover:bg-[var(--row-hover)]"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-full font-semibold tabular-nums"
                style={{
                  background: d === today ? ACCENT : selected ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : undefined,
                  color: d === today ? "#fff" : selected ? ACCENT : inMonth ? "var(--text-primary)" : "var(--text-muted)",
                  opacity: inMonth ? 1 : 0.55,
                }}
              >
                {dayOfMonth(d)}
              </span>
              {has && d !== today && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full" style={{ background: ACCENT }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Vista de mes ---
const MONTH_MAX_CHIPS = 3;

function MonthView({
  anchor,
  today,
  byDay,
  me,
  onOpen,
  onMore,
}: {
  anchor: DayKey;
  today: DayKey;
  byDay: Map<DayKey, CalendarEvent[]>;
  me: string;
  onOpen: (ev: CalendarEvent) => void;
  onMore: (d: DayKey) => void;
}) {
  const days = monthGrid(anchor);
  const month = monthIndex(anchor);
  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {w}
          </span>
        ))}
      </div>
      <div className="grid min-h-[480px] flex-1 grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const inMonth = monthIndex(d) === month;
          const weekend = weekday(d) >= 5;
          const shown = list.slice(0, MONTH_MAX_CHIPS);
          return (
            <div
              key={d}
              className="flex min-h-0 min-w-0 flex-col gap-0.5 border-[var(--border)] p-1"
              style={{
                borderRightWidth: i % 7 === 6 ? 0 : 1,
                borderBottomWidth: i >= 35 ? 0 : 1,
                background: weekend || !inMonth ? "var(--row-alt)" : undefined,
              }}
            >
              <div className="flex justify-center pb-0.5">
                <DayNumber day={d} today={today} size={24} muted={!inMonth} />
              </div>
              {/* Móvil: puntos; desde sm: pastillas como en Google. */}
              <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                {list.map((ev) => (
                  <button key={ev.id} type="button" aria-label={ev.title} onClick={() => onOpen(ev)} className="cal-chip h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                ))}
              </div>
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {shown.map((ev) => (
                  <MonthChip key={ev.id} ev={ev} day={d} today={today} going={isGoing(ev, me)} onOpen={onOpen} />
                ))}
                {list.length > shown.length && (
                  <button
                    type="button"
                    onClick={() => onMore(d)}
                    className="rounded-md px-1.5 text-left text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
                  >
                    {list.length - shown.length} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthChip({
  ev,
  day,
  today,
  going,
  onOpen,
}: {
  ev: CalendarEvent;
  day: DayKey;
  today: DayKey;
  going: boolean;
  onOpen: (ev: CalendarEvent) => void;
}) {
  const days = eventDays(ev);
  const past = days[days.length - 1] < today;
  const block = ev.allDay || days.length > 1;
  if (block) {
    return (
      <button
        type="button"
        onClick={() => onOpen(ev)}
        className="cal-chip truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold hover:-translate-y-px"
        style={chipStyle(going, past)}
      >
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">{days.length > 1 && day !== days[0] ? `↳ ${ev.title}` : ev.title}</span>
          {ev.going.length > 0 && (
            <span className="ml-auto hidden xl:block">
              <AvatarStack people={ev.going} size={14} max={3} ring={going ? ACCENT : undefined} />
            </span>
          )}
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className="cal-chip flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] hover:bg-[var(--row-hover)]"
      style={{ opacity: past ? 0.55 : 1, ...(going ? chipStyle(true, past) : {}) }}
    >
      {!going && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ACCENT }} />}
      <span className={going ? "font-medium" : "text-[var(--text-secondary)]"}>{hhmm(ev.startsAt)}</span>
      <span className={`truncate font-semibold ${going ? "" : "text-[var(--text-primary)]"}`}>{ev.title}</span>
      {ev.going.length > 0 && (
        <span className="ml-auto hidden shrink-0 xl:block">
          <AvatarStack people={ev.going} size={14} max={3} ring={going ? ACCENT : undefined} />
        </span>
      )}
    </button>
  );
}

// --- Vista de semana (rejilla horaria) ---
type Placed = { ev: CalendarEvent; top: number; height: number; col: number; cols: number };

/** Coloca los eventos con hora de un día en columnas cuando se solapan (como Google). */
function layoutDay(list: CalendarEvent[]): Placed[] {
  const timed = list
    .filter((ev) => !ev.allDay && eventDays(ev).length === 1)
    .map((ev) => {
      const s = madrid(ev.startsAt);
      const start = s.hour * 60 + s.minute;
      let end = start + 60;
      if (ev.endsAt) {
        const e = madrid(ev.endsAt);
        end = Math.max(start + 30, e.hour * 60 + e.minute);
      }
      return { ev, start, end };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Placed[] = [];
  let cluster: { ev: CalendarEvent; start: number; end: number; col: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    for (const c of cluster) {
      out.push({ ev: c.ev, top: (c.start / 60) * HOUR_PX, height: Math.max(22, ((c.end - c.start) / 60) * HOUR_PX - 2), col: c.col, cols });
    }
    cluster = [];
  };
  for (const t of timed) {
    if (t.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.end > t.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ ...t, col });
    clusterEnd = Math.max(clusterEnd, t.end);
  }
  if (cluster.length) flush();
  return out;
}

function WeekView({
  anchor,
  today,
  byDay,
  me,
  onOpen,
}: {
  anchor: DayKey;
  today: DayKey;
  byDay: Map<DayKey, CalendarEvent[]>;
  me: string;
  onOpen: (ev: CalendarEvent) => void;
}) {
  const monday = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const scroller = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 8 * HOUR_PX - 8;
  }, []);
  // Línea de "ahora": solo en cliente (evita desajustes de hidratación) y se mueve cada minuto.
  useEffect(() => {
    const tick = () => {
      const m = madrid(new Date().toISOString());
      setNowMin(m.hour * 60 + m.minute);
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const allDay = days.map((d) => (byDay.get(d) ?? []).filter((ev) => ev.allDay || eventDays(ev).length > 1));
  const hasAllDay = allDay.some((l) => l.length > 0);
  const gridCols = "grid-cols-[52px_repeat(7,minmax(0,1fr))]";

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Móvil: la semana mantiene un ancho legible y se desliza en horizontal (cabecera y horas juntas). */}
      <div className="flex min-h-0 flex-1 flex-col max-sm:overflow-x-auto">
      <div className="flex min-h-0 flex-1 flex-col max-sm:min-w-[640px]">
      <div className={`grid ${gridCols} border-b border-[var(--border)]`}>
        <span />
        {days.map((d) => (
          <div key={d} className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: d === today ? ACCENT : "var(--text-muted)" }}>
              {WEEKDAYS_SHORT[weekday(d)]}
            </span>
            <DayNumber day={d} today={today} size={34} />
          </div>
        ))}
        {hasAllDay && (
          <>
            <span className="self-center pr-2 text-right text-[10px] text-[var(--text-muted)]">todo el día</span>
            {allDay.map((list, i) => (
              <div key={days[i]} className="flex min-w-0 flex-col gap-0.5 border-l border-[var(--border)] p-0.5 pb-1">
                {list.map((ev) => (
                  <MonthChip key={ev.id} ev={ev} day={days[i]} today={today} going={isGoing(ev, me)} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`relative grid ${gridCols}`} style={{ height: 24 * HOUR_PX }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--text-muted)]" style={{ top: (h + 1) * HOUR_PX }}>
                {String(h + 1).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((d) => {
            const placed = layoutDay(byDay.get(d) ?? []);
            return (
              <div
                key={d}
                className="relative border-l border-[var(--border)]"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--gridline) ${HOUR_PX - 1}px, var(--gridline) ${HOUR_PX}px)`,
                }}
              >
                {d === today && (
                  <div className="pointer-events-none absolute inset-0" style={{ background: `color-mix(in srgb, ${ACCENT} 4%, transparent)` }} />
                )}
                {placed.map((p) => {
                  const going = isGoing(p.ev, me);
                  const past = d < today;
                  return (
                    <button
                      key={p.ev.id}
                      type="button"
                      onClick={() => onOpen(p.ev)}
                      className="cal-chip absolute flex flex-col overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm hover:z-10 hover:-translate-y-px"
                      style={{
                        top: p.top + 1,
                        height: p.height,
                        left: `calc(${(p.col / p.cols) * 100}% + 2px)`,
                        width: `calc(${100 / p.cols}% - 4px)`,
                        borderLeftColor: going ? "color-mix(in srgb, #000 18%, var(--brand-sea))" : ACCENT,
                        ...chipStyle(going, past),
                      }}
                    >
                      <span className="truncate font-semibold">{p.ev.title}</span>
                      {p.height > 34 && (
                        <span className={going ? "opacity-90" : "text-[var(--text-secondary)]"}>
                          {hhmm(p.ev.startsAt)}
                          {p.ev.endsAt ? ` – ${hhmm(p.ev.endsAt)}` : ""}
                        </span>
                      )}
                      {p.height > 56 && p.ev.location && (
                        <span className={`truncate ${going ? "opacity-90" : "text-[var(--text-muted)]"}`}>{p.ev.location}</span>
                      )}
                      {p.height > 72 && p.ev.going.length > 0 && (
                        <span className="mt-auto pt-0.5">
                          <AvatarStack people={p.ev.going} size={16} max={4} ring={going ? ACCENT : undefined} />
                        </span>
                      )}
                    </button>
                  );
                })}
                {d === today && nowMin !== null && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (nowMin / 60) * HOUR_PX }}>
                    <div className="relative h-[2px]" style={{ background: "var(--status-critical)" }}>
                      <span className="absolute -left-1.5 -top-[5px] h-3 w-3 rounded-full" style={{ background: "var(--status-critical)" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

// --- Vista de agenda ---
function AgendaView({
  events,
  from,
  today,
  me,
  onOpen,
}: {
  events: CalendarEvent[];
  from: DayKey;
  today: DayKey;
  me: string;
  onOpen: (ev: CalendarEvent) => void;
}) {
  const list = events.filter((ev) => eventDays(ev).at(-1)! >= from);
  const groups: { day: DayKey; items: CalendarEvent[] }[] = [];
  for (const ev of list) {
    const d = eventDays(ev)[0] < from ? from : eventDays(ev)[0];
    const g = groups.at(-1);
    if (g && g.day === d) g.items.push(ev);
    else groups.push({ day: d, items: [ev] });
  }
  return (
    <div className="card min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
      {groups.length === 0 && (
        <div className="grid h-full min-h-[240px] place-items-center text-center text-sm text-[var(--text-muted)]">
          No hay eventos desde {longDate(from)}.
        </div>
      )}
      {groups.map((g) => (
        <div key={g.day} className="flex gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0 sm:gap-5">
          <div className="flex w-20 shrink-0 items-start gap-2 pt-0.5 sm:w-28">
            <DayNumber day={g.day} today={today} size={30} />
            <span className="pt-1.5 text-[11px] font-semibold uppercase text-[var(--text-muted)]">
              {MONTHS[monthIndex(g.day)].slice(0, 3)}, {WEEKDAYS_SHORT[weekday(g.day)]}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {g.items.map((ev) => {
              const going = isGoing(ev, me);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onOpen(ev)}
                  className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--row-hover)]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACCENT, boxShadow: going ? `0 0 0 3px color-mix(in srgb, ${ACCENT} 25%, transparent)` : undefined }} />
                  <span className="w-24 shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">
                    {ev.allDay ? "Todo el día" : `${hhmm(ev.startsAt)}${ev.endsAt ? ` – ${hhmm(ev.endsAt)}` : ""}`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{ev.title}</span>
                  {ev.location && <span className="hidden max-w-[30%] truncate text-xs text-[var(--text-muted)] md:block">{ev.location}</span>}
                  {ev.going.length > 0 && <AvatarStack people={ev.going} />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Personas ---
function Avatar({ p, size = 24, ring }: { p: CalendarPerson; size?: number; ring?: string }) {
  const label = p.name ?? p.email;
  if (p.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.avatarUrl} alt={label} title={label} width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full" style={{ boxShadow: `0 0 0 1.5px ${ring ?? "var(--surface-1)"}` }} />
    );
  }
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span
      title={label}
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(7, size * 0.42),
        background: "color-mix(in srgb, var(--brand-sea) 16%, var(--surface-1))",
        color: "var(--brand-sea)",
        boxShadow: `0 0 0 1.5px ${ring ?? "var(--surface-1)"}`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

function AvatarStack({
  people,
  size = 22,
  max = 4,
  ring,
}: {
  people: CalendarPerson[];
  size?: number;
  max?: number;
  ring?: string;
}) {
  return (
    <span className="flex shrink-0" title={`Van: ${people.map((p) => p.name ?? p.email).join(", ")}`}>
      {people.slice(0, max).map((p, i) => (
        <span key={p.id} style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <Avatar p={p} size={size} ring={ring} />
        </span>
      ))}
      {people.length > max && (
        <span
          className="grid place-items-center rounded-full bg-[var(--surface-1)] font-bold text-[var(--text-secondary)]"
          style={{ width: size, height: size, fontSize: Math.max(7, size * 0.4), marginLeft: -size * 0.3, boxShadow: `0 0 0 1.5px ${ring ?? "var(--surface-1)"}` }}
        >
          +{people.length - max}
        </span>
      )}
    </span>
  );
}

function PeopleRow({ label, people, tone }: { label: string; people: CalendarPerson[]; tone: string }) {
  if (people.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
        {label} · {people.length}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-[var(--pill-neutral-bg)] py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-[var(--text-primary)]">
            <Avatar p={p} size={20} />
            {p.name?.split(" ")[0] ?? p.email}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Ficha del evento ---
function EventDialog({
  ev,
  today,
  me,
  saving,
  error,
  onAnswer,
  onClose,
}: {
  ev: CalendarEvent;
  today: DayKey;
  me: string;
  saving: boolean;
  error: string | null;
  onAnswer: (r: "voy" | "no_voy") => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const going = isGoing(ev, me);
  const notGoing = ev.notGoing.some((p) => p.email.toLowerCase() === me.toLowerCase());
  const past = eventDays(ev).at(-1)! < today;
  const otherTz = ev.eventTz && ev.eventTz !== "Europe/Madrid";

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] grid place-items-center p-4" onClick={onClose}>
      <div className="modal-panel flex max-h-[88vh] w-full max-w-md flex-col gap-4 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded" style={{ background: ACCENT }} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">{ev.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {whenLabel(ev)}
              {otherTz ? " (hora de Madrid)" : ""}
            </p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="-mr-2 -mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--row-hover)]">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {going && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`, color: ACCENT }}>
              Vas
            </span>
          )}
          {past && <span className="rounded-full bg-[var(--pill-neutral-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--text-muted)]">Ya pasó</span>}
          {ev.source && (
            <span className="rounded-full bg-[var(--pill-neutral-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--text-secondary)]">
              {ev.source === "exa" ? "Encontrado por el agente" : "Enviado a events@"}
            </span>
          )}
        </div>

        {(ev.location || ev.url) && (
          <div className="flex flex-col gap-2 text-sm">
            {ev.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 text-[var(--text-primary)] hover:underline"
              >
                <span aria-hidden>📍</span>
                {ev.location}
              </a>
            )}
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 font-semibold hover:underline" style={{ color: ACCENT }}>
                <span aria-hidden>🔗</span>
                Más info / registro
              </a>
            )}
          </div>
        )}

        {ev.description && <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{ev.description}</p>}

        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--row-alt)] p-3">
          <PeopleRow label="Van" people={ev.going} tone="var(--status-good)" />
          <PeopleRow label="Puede encajar a" people={ev.suggested} tone="var(--brand-sun)" />
          <PeopleRow label="No van" people={ev.notGoing} tone="var(--text-muted)" />
          {ev.going.length + ev.suggested.length + ev.notGoing.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Nadie ha respondido todavía.</p>
          )}
        </div>

        {!past && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">¿Vas?</span>
              <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-0.5 shadow-sm">
                {(
                  [
                    ["voy", "Voy", going],
                    ["no_voy", "No voy", notGoing],
                  ] as const
                ).map(([value, label, on]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={saving || on}
                    aria-pressed={on}
                    onClick={() => onAnswer(value)}
                    className="rounded-full px-4 py-1 text-sm font-semibold transition-colors disabled:cursor-default"
                    style={
                      on
                        ? value === "voy"
                          ? { background: ACCENT, color: "#fff" }
                          : { background: "var(--pill-neutral-bg)", color: "var(--text-primary)" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {saving && <span className="text-xs text-[var(--text-muted)]">Guardando…</span>}
            </div>
            {error ? (
              <p className="text-xs font-semibold text-[var(--status-critical)]">{error}</p>
            ) : going ? (
              <p className="text-xs text-[var(--text-muted)]">Te llega la invitación de Google Calendar en un minuto.</p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {ev.googleUrl && (
            <a
              href={ev.googleUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)]"
            >
              Google Calendar
            </a>
          )}
          {ev.slackUrl && !past && (
            <a
              href={ev.slackUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)]"
            >
              Ver en #events
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
