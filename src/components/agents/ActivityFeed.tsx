import type { AgentEvent } from "@/lib/agents";
import { eventIcon, eventLabel } from "@/lib/agents";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

function subjectLine(e: AgentEvent): string {
  const who = [e.founder, e.company && e.founder ? `(${e.company})` : e.company].filter(Boolean).join(" ");
  return who || e.threadId || "";
}

export function ActivityFeed({ events }: { events: AgentEvent[] }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <h3 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Actividad reciente</h3>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          Nada registrado todavía — en cuanto el agente actúe, aparecerá aquí.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {events.map((e) => {
            const detailUrl =
              typeof e.detail?.web_url === "string" ? (e.detail.web_url as string) : null;
            return (
              <li key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className="mt-0.5 shrink-0 text-base" aria-hidden>
                  {eventIcon(e.eventType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[var(--text-primary)]">
                    <span className="font-medium">{eventLabel(e.eventType)}</span>
                    {subjectLine(e) && <span className="text-[var(--text-secondary)]"> — {subjectLine(e)}</span>}
                    {e.region && (
                      <span className="ml-1.5 rounded-full bg-[var(--pill-neutral-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                        {e.region}
                      </span>
                    )}
                  </p>
                  {detailUrl && (
                    <a
                      href={detailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--brand-sea)] hover:underline"
                    >
                      Ver en Attio →
                    </a>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-[var(--text-muted)]">
                  {timeAgo(e.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
