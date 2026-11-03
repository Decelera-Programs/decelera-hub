import type { PendingApproval } from "@/lib/agents";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3600000);
  if (hours < 1) return "hace menos de 1 h";
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/** Borradores con un `reply_drafted` sin `approval_sent`/`approval_rejected` posterior — ver
 * getPendingApprovals. A diferencia de "needs review" (que no tiene señal de cuándo se resuelve a mano
 * en Attio, así que queda fuera de este panel y solo vive en el feed de actividad), esto SÍ se resuelve
 * limpio en cuanto el botón de Slack se pulsa, así que es fiable mostrarlo como una cola en vivo. */
export function PendingApprovalsPanel({ items }: { items: PendingApproval[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card flex flex-col gap-3 border-[color-mix(in_srgb,var(--status-warning)_35%,var(--border))] p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
        <span aria-hidden>⏳</span> Esperando tu aprobación en Slack
      </h3>
      <ul className="flex flex-col divide-y divide-[var(--border)]">
        {items.map((a) => (
          <li key={a.threadId} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-[var(--text-primary)]">
              {[a.founder, a.company].filter(Boolean).join(" — ") || a.threadId}
              {a.region && (
                <span className="ml-1.5 rounded-full bg-[var(--pill-neutral-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  {a.region}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">{timeAgo(a.draftedAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
