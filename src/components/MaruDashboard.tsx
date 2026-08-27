import { StatTile } from "./SummaryKpis";
import { WeeklyVolumeChart } from "./WeeklyVolumeChart";
import { buildContactStatusCounts, gateOutMetric } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

/**
 * Filters on the raw pre-rollup `sourceLabel` ("Maru") instead of the rolled-up `channel`
 * ("Outreach") — Maru is one of several sources that fold into Outreach in the main dashboard.
 */
export function MaruDashboard({ deals }: { deals: Deal[] }) {
  const maruDeals = deals.filter((d) => d.sourceLabel === "Maru");
  const conversion = gateOutMetric(maruDeals);
  const { videocallScheduled, videocallDone } = buildContactStatusCounts(maruDeals);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Canal Maru</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Solo deals cuya fuente cruda (reference_3) es &ldquo;Maru&rdquo; — no el canal
          &ldquo;Outreach&rdquo; agregado. {maruDeals.length} deals en total.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Maru → llamada + análisis"
          value={conversion.pct !== null ? `${conversion.pct}%` : "—"}
          caption={`${conversion.spoke} de ${conversion.base} llegaron a "In play"`}
          accent="var(--series-1)"
        />
        <StatTile
          label="Llamada agendada"
          value={String(videocallScheduled)}
          caption='Contact Status = "Videocall Scheduled"'
          accent="var(--series-2)"
        />
        <StatTile
          label="En análisis (llamada hecha)"
          value={String(videocallDone)}
          caption='Contact Status = "Videocall Done"'
          accent="var(--status-warning)"
        />
      </div>

      <WeeklyVolumeChart deals={maruDeals} />
    </div>
  );
}
