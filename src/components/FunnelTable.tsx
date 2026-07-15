"use client";

import { Fragment, useState } from "react";
import { ChannelLegend } from "./ChannelLegend";
import { ChartCard } from "./ChartCard";
import { buildFunnelMatrix, CHANNEL_EFFICIENCY_BENCHMARK_PCT, MIN_SAMPLE_FOR_EFFICIENCY } from "@/lib/aggregate";
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

const TIER1_HINT = "Startups con Tier 1 en el form score";
const CONVERSION_HINT = "Invested ÷ total de la fila";
const EFFICIENCY_HINT = "In play ÷ Contacted — verde/rojo contra el benchmark, gris si hay muy pocos datos";
const GROUP_ORDER = ["Curated", "Mass", "Inbound", null] as const;
const GROUP_HINT: Record<"Curated" | "Mass" | "Inbound", string> = {
  Curated: "Contacto personal/curado: referrals, eventos, LinkedIn manual",
  Mass: "Alcance masivo automatizado: mass mailing, LinkedIn masivo (Maru)",
  Inbound: "Llegaron solos: social media, newsletter, búsqueda — Attio no distingue la plataforma exacta todavía",
};

const COLUMN_COUNT = 1 + PIPELINE_ORDER.length + 3;
const OUTCOME_BG = "var(--column-band)";

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

/** Count with its de-emphasized conversion % beside it — the number is the point, the % is context. */
function StatCell({ count, base }: { count: number; base: number | null }) {
  const p = base === null || base === 0 ? null : pct(count, base);
  return (
    <>
      {count}
      {p !== null && <span className="ml-1 text-[var(--text-muted)]">({p}%)</span>}
    </>
  );
}

/** Target rate (goalCount ÷ goalBase) shown next to the achieved rate, colored by whether we're meeting it. */
function TargetPct({
  actual,
  goalCount,
  goalBase,
}: {
  actual: number | null;
  goalCount: number | null;
  goalBase: number | null;
}) {
  if (actual === null || goalCount === null || goalBase === null || goalBase === 0) return null;
  const targetPct = Math.round((goalCount / goalBase) * 100);
  const met = actual >= targetPct;
  return (
    <span
      title={`Meta: ${targetPct}% (${goalCount}/${goalBase})`}
      className="ml-1.5 cursor-help font-medium"
      style={{ color: met ? "var(--status-good)" : "var(--status-critical)" }}
    >
      {targetPct}%
    </span>
  );
}

/** In play ÷ Contacted, colored against the benchmark — gray "n bajo" under the reliability floor. */
function EfficiencyPct({ contacted, inPlay }: { contacted: number; inPlay: number }) {
  if (contacted < MIN_SAMPLE_FOR_EFFICIENCY) {
    return (
      <span className="italic text-[var(--text-muted)]" title={`Menos de ${MIN_SAMPLE_FOR_EFFICIENCY} contactadas — no es una tasa fiable todavía`}>
        n bajo
      </span>
    );
  }
  const p = pct(inPlay, contacted);
  if (p === null) return <span className="text-[var(--text-muted)]">—</span>;
  const { color, bg } =
    CHANNEL_EFFICIENCY_BENCHMARK_PCT === null
      ? { color: "var(--text-secondary)", bg: "var(--gridline)" }
      : p >= CHANNEL_EFFICIENCY_BENCHMARK_PCT
        ? { color: "var(--status-good)", bg: "var(--pill-good-bg)" }
        : { color: "var(--status-critical)", bg: "var(--pill-critical-bg)" };
  return (
    <span
      className="inline-flex cursor-help rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, background: bg }}
      title={CHANNEL_EFFICIENCY_BENCHMARK_PCT !== null ? `Benchmark: ${CHANNEL_EFFICIENCY_BENCHMARK_PCT}%` : "Benchmark pendiente"}
    >
      {p}%
    </span>
  );
}

/** Tiny progress-to-goal indicator, tucked into the channel cell instead of a dedicated column. */
function GoalIndicator({ current, goal }: { current: number; goal: number }) {
  const filled = Math.min(100, Math.round((current / goal) * 100));
  return (
    <span
      title={`Objetivo: ${goal} · ${filled}% conseguido`}
      className="ml-auto flex shrink-0 cursor-help items-center gap-1.5 text-[10px] font-normal tabular-nums text-[var(--text-muted)]"
    >
      <span className="text-right">
        {current}/{goal}
      </span>
      <span className="relative h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--gridline)]">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${filled}%`, background: "var(--series-1)" }}
        />
      </span>
    </span>
  );
}

function ConversionRow({
  row,
  variant = "main",
  expandable = false,
  expanded = false,
  onToggle,
  zebra = false,
  showGoals = false,
}: {
  row: FunnelMatrixRow;
  variant?: "main" | "sub";
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  zebra?: boolean;
  showGoals?: boolean;
}) {
  const isTotal = row.key === "TOTAL";
  const isSub = variant === "sub";
  const rowBg = isTotal ? "var(--page)" : zebra ? "var(--row-alt)" : undefined;

  return (
    <tr className="border-t border-[var(--gridline)] transition-colors hover:bg-[var(--row-hover)]" style={rowBg ? { background: rowBg } : undefined}>
      <td
        className={`px-3 py-2.5 font-medium text-[var(--text-primary)] ${isSub ? "text-[var(--text-secondary)]" : ""}`}
        style={isTotal ? { fontWeight: 600 } : undefined}
      >
        <span className={`flex items-center gap-1.5 ${isSub ? "pl-8" : ""}`}>
          {!isSub && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {expandable && (
                <button
                  onClick={onToggle}
                  aria-label={expanded ? "Colapsar desglose por fuente" : "Ver desglose por fuente"}
                  aria-expanded={expanded}
                  className="flex h-4 w-4 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {expanded ? "▾" : "▸"}
                </button>
              )}
            </span>
          )}
          {row.channel && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: CHANNEL_COLOR[row.channel] }}
            />
          )}
          {row.label}
          {showGoals && row.goal !== null && <GoalIndicator current={row.total} goal={row.goal} />}
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
            <StatCell count={row.stageCounts[stage]} base={prevCount} />
          </td>
        );
      })}
      <td
        className="border-l border-[var(--gridline)] px-3 py-2.5 text-right tabular-nums"
        style={{ background: OUTCOME_BG, ...(isTotal ? { fontWeight: 600 } : {}) }}
      >
        <EfficiencyPct contacted={row.stageCounts.Contacted} inPlay={row.stageCounts["In play"]} />
      </td>
      <td
        className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
        style={{ background: OUTCOME_BG, ...(isTotal ? { fontWeight: 600 } : {}) }}
      >
        <StatCell count={row.tier1} base={row.total} />
        {showGoals && (
          <TargetPct actual={pct(row.tier1, row.total)} goalCount={row.tier1Goal} goalBase={row.goal} />
        )}
      </td>
      <td
        className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]"
        style={{ background: OUTCOME_BG, ...(isTotal ? { fontWeight: 600 } : {}) }}
      >
        {pct(row.stageCounts.Invested, row.total) ?? "—"}%
        {showGoals && (
          <TargetPct
            actual={pct(row.stageCounts.Invested, row.total)}
            goalCount={row.selectedGoal}
            goalBase={row.goal}
          />
        )}
      </td>
    </tr>
  );
}

export function FunnelTable({ deals, showGoals = false }: { deals: Deal[]; showGoals?: boolean }) {
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

  const zebraByKey = new Map(
    sections.flatMap((section) => section.rows).map((row, index) => [row.key, index % 2 === 1])
  );

  return (
    <ChartCard
      title="Funnel por canal de entrada"
      subtitle={`Conversión acumulada por etapa · ${deals.length} deals`}
    >
      <div
        className="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
        style={{ background: "var(--warning-bg)", borderColor: "var(--warning-border)", color: "var(--warning-fg)" }}
      >
        <span aria-hidden>⚠</span>
        <p>
          Por debajo de n={MIN_SAMPLE_FOR_EFFICIENCY} las conversiones se muestran en gris — son
          anécdotas, no tasas. La comparativa de canal es fiable solo al cierre.
        </p>
      </div>
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
                title={EFFICIENCY_HINT}
                className="cursor-help border-l border-[var(--gridline)] px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
                style={{ background: OUTCOME_BG }}
              >
                Efic. In play/Contacted
              </th>
              <th
                title={TIER1_HINT}
                className="cursor-help px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
                style={{ background: OUTCOME_BG }}
              >
                Tier 1
              </th>
              <th
                title={CONVERSION_HINT}
                className="cursor-help px-3 py-2 text-right font-medium text-[var(--text-secondary)]"
                style={{ background: OUTCOME_BG }}
              >
                Conversión a selección
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
                  const zebra = zebraByKey.get(row.key) ?? false;
                  return (
                    <Fragment key={row.key}>
                      <ConversionRow
                        row={row}
                        expandable={expandable}
                        expanded={expanded}
                        onToggle={() => toggle(row.key)}
                        zebra={zebra}
                        showGoals={showGoals}
                      />
                      {expanded &&
                        row.subRows.map((subRow) => (
                          <ConversionRow
                            key={`${row.key}::${subRow.key}`}
                            row={subRow}
                            variant="sub"
                            zebra={zebra}
                            showGoals={showGoals}
                          />
                        ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
            {totalRow && <ConversionRow key={totalRow.key} row={totalRow} showGoals={showGoals} />}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Cada celda cuenta startups que llegaron a esa etapa o más allá — incluye a las que después
        murieron, contando hasta dónde llegaron antes de caer. El % es la conversión respecto a la
        etapa anterior. Efic. In play/Contacted, Tier 1 y Conversión a selección (fondo resaltado)
        son sobre el total de la fila; con menos de {MIN_SAMPLE_FOR_EFFICIENCY} contactadas, la
        eficiencia se muestra en gris (&ldquo;n bajo&rdquo;) porque no es una tasa fiable todavía.
        Curated / Mass / Inbound son una agrupación direccional nuestra (no un dato de Attio):
        Curated = contacto personal (referrals, eventos, LinkedIn manual), Mass = alcance masivo
        automatizado (mass mailing, LinkedIn vía Maru), Inbound = llegaron solos — Attio no
        distingue todavía si fue newsletter, LinkedIn, Instagram o web, todo cae en el mismo valor.
        Las filas con ▸ mezclan más de una fuente — haz clic para desglosarlas.
        {showGoals && (
          <>
            {" "}
            La barrita junto al nombre del canal es el objetivo 2026 (deals conseguidos ÷ meta). En
            Tier 1 / Conversión a selección, el % en verde o rojo junto al actual es la meta 2026
            (verde = la igualamos o superamos, rojo = vamos por debajo). Los objetivos solo se
            muestran en &ldquo;Todos&rdquo; porque se definieron para Leads + Aplicaciones juntos.
          </>
        )}
      </p>
      <ChannelLegend />
    </ChartCard>
  );
}
