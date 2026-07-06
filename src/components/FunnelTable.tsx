import { ChartCard } from "./ChartCard";
import { buildFunnelMatrix } from "@/lib/aggregate";
import { CHANNEL_COLOR } from "@/lib/colors";
import { PIPELINE_ORDER } from "@/lib/transform";
import type { Deal } from "@/lib/types";

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
                  className="px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
                >
                  {stage}
                </th>
              ))}
              <th className="border-l border-[var(--gridline)] px-3 py-2 text-right font-medium text-[var(--status-critical)]">
                Killed
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--status-critical)]">
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
        Cada celda de etapa cuenta deals que llegaron a esa etapa o más allá (vivos por{" "}
        <code>status</code>, muertos por su último estado activo en <code>status_6</code>). % =
        conversión respecto a la etapa anterior en la misma fila. Killed / Not qualified son
        totales informativos, no forman parte de la cadena de conversión.
      </p>
    </ChartCard>
  );
}
