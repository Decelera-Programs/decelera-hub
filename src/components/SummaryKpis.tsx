import type { Deal, StatusValue } from "@/lib/types";

const IN_PROCESS_STATUSES: StatusValue[] = ["Contacted", "Qualified", "In play", "Pre-committee"];
const KILLED_STATUSES: StatusValue[] = ["Killed", "Not qualified"];

function StatTile({
  label,
  value,
  pctOfTotal,
  accent,
}: {
  label: string;
  value: number;
  pctOfTotal: number | null;
  accent: string;
}) {
  return (
    <div className="card flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="text-3xl font-semibold text-[var(--text-primary)]">{value}</span>
      {pctOfTotal !== null && (
        <span className="text-xs text-[var(--text-muted)]">{pctOfTotal}% del total</span>
      )}
    </div>
  );
}

export function SummaryKpis({ deals }: { deals: Deal[] }) {
  const total = deals.length;
  const enProceso = deals.filter((d) => d.status !== null && IN_PROCESS_STATUSES.includes(d.status)).length;
  const matados = deals.filter((d) => d.status !== null && KILLED_STATUSES.includes(d.status)).length;

  const pctOf = (count: number) => (total > 0 ? Math.round((count / total) * 100) : null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile label="Total" value={total} pctOfTotal={null} accent="var(--series-1)" />
      <StatTile label="En proceso" value={enProceso} pctOfTotal={pctOf(enProceso)} accent="var(--status-warning)" />
      <StatTile label="Matados" value={matados} pctOfTotal={pctOf(matados)} accent="var(--status-critical)" />
    </div>
  );
}
