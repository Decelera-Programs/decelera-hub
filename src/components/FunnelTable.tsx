import { ChannelLegend } from "./ChannelLegend";
import { ChartCard } from "./ChartCard";
import { buildFunnelMatrix } from "@/lib/aggregate";
import { CHANNEL_COLOR } from "@/lib/colors";
import { PIPELINE_ORDER } from "@/lib/transform";
import type { Deal, PipelineStatus } from "@/lib/types";

const STAGE_HINT: Record<PipelineStatus, string> = {
  Contacted: "Primer contacto con la startup",
  Qualified: "Pasó el primer filtro de calidad",
  "In play": "En proceso activo de evaluación",
  "Pre-committee": "Presentada al comité de inversión",
  Invested: "Decelera invirtió",
};

const KILLED_HINT = "Descartada después de avanzar en el proceso";
const NOT_QUALIFIED_HINT = "Descartada antes de avanzar (no pasó el primer filtro)";

function formatStageCell(count: number, prevCount: number | null) {
  if (prevCount === null || prevCount === 0) return String(count);
  const pct = Math.round((count / prevCount) * 100);
  return `${count} (${pct}%)`;
}

export function FunnelTable({ deals }: { deals: Deal[] }) {
  const rows = buildFunnelMatrix(deals);

  return (
    <ChartCard
      title="Funnel por canal de entrada"
      subtitle={`Conversión acumulada por etapa · ${deals.length} deals`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">
                Canal
              </th>
              {PIPELINE_ORDER.map((stage) => (
                <th
                  key={stage}
                  title={STAGE_HINT[stage]}
                  className="cursor-help px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
                >
                  {stage}
                </th>
              ))}
              <th
                title={KILLED_HINT}
                className="cursor-help border-l border-[var(--gridline)] px-3 py-2 text-right font-medium text-[var(--status-critical)]"
              >
                Killed
              </th>
              <th
                title={NOT_QUALIFIED_HINT}
                className="cursor-help px-3 py-2 text-right font-medium text-[var(--status-critical)]"
              >
                Not qualified
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.channel}
                className="border-t border-[var(--gridline)]"
                style={row.channel === "TOTAL" ? { background: "var(--page)" } : undefined}
              >
                <td
                  className="px-3 py-2.5 font-medium text-[var(--text-primary)]"
                  style={row.channel === "TOTAL" ? { fontWeight: 600 } : undefined}
                >
                  {row.channel !== "TOTAL" && (
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: CHANNEL_COLOR[row.channel] }}
                    />
                  )}
                  {row.channel}
                </td>
                {PIPELINE_ORDER.map((stage, i) => {
                  const prevStage = i === 0 ? null : PIPELINE_ORDER[i - 1];
                  const prevCount = prevStage ? row.stageCounts[prevStage] : null;
                  return (
                    <td
                      key={stage}
                      className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
                      style={row.channel === "TOTAL" ? { fontWeight: 600 } : undefined}
                    >
                      {formatStageCell(row.stageCounts[stage], prevCount)}
                    </td>
                  );
                })}
                <td
                  className="border-l border-[var(--gridline)] px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
                  style={row.channel === "TOTAL" ? { fontWeight: 600 } : undefined}
                >
                  {row.killed}
                </td>
                <td
                  className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
                  style={row.channel === "TOTAL" ? { fontWeight: 600 } : undefined}
                >
                  {row.notQualified}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Cada celda cuenta startups que llegaron a esa etapa o más allá — incluye a las que después
        murieron, contando hasta dónde llegaron antes de caer. El % es la conversión respecto a la
        etapa anterior. Killed / Not qualified son totales por canal, no una etapa más del funnel
        (pasa el cursor por cada columna para ver el detalle).
      </p>
      <ChannelLegend />
    </ChartCard>
  );
}
