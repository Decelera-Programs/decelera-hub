import { ChartCard } from "./ChartCard";
import { StatTile } from "./SummaryKpis";
import { WeeklyVolumeChart } from "./WeeklyVolumeChart";
import { buildContactStatusCounts, buildKilledReasonBreakdown, gateOutMetric } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

/** One labeled bar in the kill-reason breakdown — width proportional to its share of Killed deals. */
function KilledReasonRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-[var(--text-secondary)]">{label}</span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gridline)" }}>
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: "var(--series-1)" }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
        {count} ({pct}%)
      </span>
    </div>
  );
}

/**
 * Filters on the raw pre-rollup `sourceLabel` ("Maru") instead of the rolled-up `channel`
 * ("Outreach") — Maru is one of several sources that fold into Outreach in the main dashboard.
 */
export function MaruDashboard({ deals }: { deals: Deal[] }) {
  const maruDeals = deals.filter((d) => d.sourceLabel === "Maru");
  const conversion = gateOutMetric(maruDeals);
  const { videocallScheduled, videocallDone } = buildContactStatusCounts(maruDeals);
  const killedReasons = buildKilledReasonBreakdown(maruDeals);

  const formsCompleted = maruDeals.filter((d) => d.formScore.total !== null).length;
  const formCompletionPct = maruDeals.length > 0 ? Math.round((formsCompleted / maruDeals.length) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Canal Maru</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Solo deals cuya fuente cruda (reference_3) es &ldquo;Maru&rdquo; — no el canal
          &ldquo;Outreach&rdquo; agregado. {maruDeals.length} deals en total.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Maru → llamada + análisis"
          value={conversion.pct !== null ? `${conversion.pct}%` : "—"}
          caption={`${conversion.spoke} de ${conversion.base} llegaron a "In play"`}
          accent="var(--series-1)"
        />
        <StatTile
          label="Formulario completado"
          value={formCompletionPct !== null ? `${formCompletionPct}%` : "—"}
          caption={`${formsCompleted} de ${maruDeals.length} deals`}
          accent="var(--series-3)"
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

      {killedReasons.total > 0 && (
        <ChartCard
          title="Por qué mueren los Killed de Maru"
          subtitle={`${killedReasons.total} deals de Maru marcados "Killed" en total`}
        >
          <div className="flex flex-col gap-2.5">
            {killedReasons.reasons.map((r) => (
              <KilledReasonRow key={r.label} label={r.label} count={r.count} total={killedReasons.total} />
            ))}
          </div>
        </ChartCard>
      )}

      <WeeklyVolumeChart deals={maruDeals} />
    </div>
  );
}
