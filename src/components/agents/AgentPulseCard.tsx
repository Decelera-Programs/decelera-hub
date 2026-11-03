import type { AgentHealth, AgentRunStatus } from "@/lib/agents";

const HEALTH_STYLE: Record<AgentHealth, { bg: string; ink: string; label: string; dot: string }> = {
  healthy: { bg: "var(--pill-good-bg)", ink: "var(--status-good)", label: "Activo", dot: "var(--status-good)" },
  stalled: { bg: "var(--pill-critical-bg)", ink: "var(--status-critical)", label: "Estancado", dot: "var(--status-critical)" },
  unknown: { bg: "var(--pill-neutral-bg)", ink: "var(--text-muted)", label: "Sin datos aún", dot: "var(--text-muted)" },
};

const RUN_STATUS_LABEL: Record<AgentRunStatus, string> = {
  running: "en curso",
  success: "ok",
  error: "con error",
  no_op: "sin novedades",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "nunca";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function AgentPulseCard({
  emoji,
  label,
  health,
  lastRunAt,
  lastRunStatus,
  runsToday,
  eventsToday,
}: {
  emoji: string;
  label: string;
  health: AgentHealth;
  lastRunAt: string | null;
  lastRunStatus: AgentRunStatus | null;
  runsToday: number;
  eventsToday: number;
}) {
  const s = HEALTH_STYLE[health];
  return (
    <div className="card spotlight flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{label}</h3>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"
          style={{ background: s.bg, color: s.ink }}
        >
          <span
            aria-hidden
            className={health === "healthy" ? "pulse-dot h-1.5 w-1.5 rounded-full" : "h-1.5 w-1.5 rounded-full"}
            style={{ background: s.dot }}
          />
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span>
          Última ejecución: <strong className="text-[var(--text-primary)]">{timeAgo(lastRunAt)}</strong>
          {lastRunStatus && <span className="text-[var(--text-muted)]"> ({RUN_STATUS_LABEL[lastRunStatus]})</span>}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-[var(--text-muted)]">
        <span>
          <strong className="text-[var(--text-primary)]">{runsToday}</strong> ejecuciones hoy
        </span>
        <span>
          <strong className="text-[var(--text-primary)]">{eventsToday}</strong> acciones hoy
        </span>
      </div>
    </div>
  );
}
