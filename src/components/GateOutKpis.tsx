import { StatTile } from "./SummaryKpis";
import { buildContactStatusCounts, buildGateOutSummary } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

export function GateOutKpis({ deals }: { deals: Deal[] }) {
  const { overall, outreach } = buildGateOutSummary(deals);
  const { videocallScheduled, videocallDone } = buildContactStatusCounts(deals);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Aplicaciones → llamada + análisis"
        value={overall.pct !== null ? `${overall.pct}%` : "—"}
        caption={`${overall.spoke} de ${overall.base} aplicaciones llegaron a "In play"`}
        accent="var(--series-1)"
      />
      <StatTile
        label="Outreach → hablamos con ellos"
        value={outreach.pct !== null ? `${outreach.pct}%` : "—"}
        caption={`${outreach.spoke} de ${outreach.base} contactos por outreach llegaron a "In play"`}
        accent="var(--series-2)"
      />
      <StatTile
        label="Llamada agendada"
        value={String(videocallScheduled)}
        caption='Contact Status = "Videocall Scheduled"'
        accent="var(--series-3)"
      />
      <StatTile
        label="En análisis (llamada hecha)"
        value={String(videocallDone)}
        caption='Contact Status = "Videocall Done"'
        accent="var(--status-warning)"
      />
    </div>
  );
}
