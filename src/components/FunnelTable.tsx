"use client";

import { Fragment, useState } from "react";
import { ChannelLegend } from "./ChannelLegend";
import { ChartCard } from "./ChartCard";
import { buildFunnelMatrix } from "@/lib/aggregate";
import type { FunnelMatrixRow } from "@/lib/aggregate";
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
const TIER1_HINT = "Startups con Tier 1 en el form score";
const CONVERSION_HINT = "Invested ÷ total de la fila";
const GROUP_ORDER = ["Curado", "Masivo", null] as const;
const GROUP_HINT: Record<"Curado" | "Masivo", string> = {
  Curado: "Contacto personal/curado: referrals, eventos, LinkedIn manual",
  Masivo: "Alcance masivo: outbound automatizado, marketing",
};

const COLUMN_COUNT = 1 + PIPELINE_ORDER.length + 4;

function formatStageCell(count: number, prevCount: number | null) {
  if (prevCount === null || prevCount === 0) return String(count);
  const pct = Math.round((count / prevCount) * 100);
  return `${count} (${pct}%)`;
}

function formatPct(numerator: number, denominator: number) {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function ConversionRow({
  row,
  variant = "main",
  expandable = false,
  expanded = false,
  onToggle,
}: {
  row: FunnelMatrixRow;
  variant?: "main" | "sub";
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const isTotal = row.key === "TOTAL";
  const isSub = variant === "sub";
  return (
    <tr
      className="border-t border-[var(--gridline)]"
      style={isTotal ? { background: "var(--page)" } : undefined}
    >
      <td
        className={`px-3 py-2.5 font-medium text-[var(--text-primary)] ${isSub ? "pl-8 text-[var(--text-secondary)]" : ""}`}
        style={isTotal ? { fontWeight: 600 } : undefined}
      >
        <span className="flex items-center gap-1.5">
          {expandable && (
            <button
              onClick={onToggle}
              aria-label={expanded ? "Colapsar desglose por fuente" : "Ver desglose por fuente"}
              aria-expanded={expanded}
              className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-muted)]"
            >
              {expanded ? "▾" : "▸"}
            </button>
          )}
          {row.channel && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: CHANNEL_COLOR[row.channel] }}
            />
          )}
          {row.label}
        </span>
      </td>
      {PIPELINE_ORDER.map((stage, i) => {
        const prevStage = i === 0 ? null : PIPELINE_ORDER[i - 1];
        const prevCount = prevStage ? row.stageCounts[prevStage] : null;
        return (
          <td
            key={stage}
            className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
            style={isTotal ? { fontWeight: 600 } : undefined}
          >
            {formatStageCell(row.stageCounts[stage], prevCount)}
          </td>
        );
      })}
      <td
        className="border-l border-[var(--gridline)] px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
        style={isTotal ? { fontWeight: 600 } : undefined}
      >
        {row.tier1} ({formatPct(row.tier1, row.total)})
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]" style={isTotal ? { fontWeight: 600 } : undefined}>
        {formatPct(row.stageCounts.Invested, row.total)}
      </td>
      <td
        className="border-l border-[var(--gridline)] px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
        style={isTotal ? { fontWeight: 600 } : undefined}
      >
        {row.killed}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]" style={isTotal ? { fontWeight: 600 } : undefined}>
        {row.notQualified}
      </td>
    </tr>
  );
}

export function FunnelTable({ deals }: { deals: Deal[] }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const rows = buildFunnelMatrix(deals);
  const totalRow = rows.find((row) => row.key === "TOTAL");
  const sections = GROUP_ORDER.map((group) => ({
    group,
    rows: rows.filter((row) => row.key !== "TOTAL" && row.group === group),
  })).filter((section) => section.rows.length > 0);

  function toggle(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
                title={TIER1_HINT}
                className="cursor-help border-l border-[var(--gridline)] px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
              >
                Tier 1
              </th>
              <th
                title={CONVERSION_HINT}
                className="cursor-help px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
              >
                Conversión a selección
              </th>
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
            {sections.map((section) => (
              <Fragment key={section.group ?? "sin-clasificar"}>
                <tr className="border-t border-[var(--gridline)]">
                  <td
                    colSpan={COLUMN_COUNT}
                    title={section.group ? GROUP_HINT[section.group] : undefined}
                    className={`bg-[var(--page)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] ${section.group ? "cursor-help" : ""}`}
                  >
                    {section.group ?? "Sin clasificar"}
                  </td>
                </tr>
                {section.rows.map((row) => {
                  const expandable = row.subRows.length > 0;
                  const expanded = expandedKeys.has(row.key);
                  return (
                    <Fragment key={row.key}>
                      <ConversionRow
                        row={row}
                        expandable={expandable}
                        expanded={expanded}
                        onToggle={() => toggle(row.key)}
                      />
                      {expanded &&
                        row.subRows.map((subRow) => (
                          <ConversionRow key={`${row.key}::${subRow.key}`} row={subRow} variant="sub" />
                        ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
            {totalRow && <ConversionRow key={totalRow.key} row={totalRow} />}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Cada celda cuenta startups que llegaron a esa etapa o más allá — incluye a las que después
        murieron, contando hasta dónde llegaron antes de caer. El % es la conversión respecto a la
        etapa anterior. Tier 1 y Conversión a selección son sobre el total de la fila. Killed / Not
        qualified son totales por canal, no una etapa más del funnel (pasa el cursor por cada
        columna para ver el detalle). Las secciones Curado / Masivo son una agrupación aproximada
        nuestra (no un dato de Attio): &ldquo;Outreach&rdquo; se separa en Event y LinkedIn manual
        (Curado) vs. outbound automatizado (Masivo). Las filas con ▸ mezclan más de una fuente —
        haz clic para desglosarlas.
      </p>
      <ChannelLegend />
    </ChartCard>
  );
}
