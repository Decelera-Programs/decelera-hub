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

const TIER1_COUNT_HINT = "Startups con Tier 1 en el form score";
const TIER1_PCT_HINT = "Tier 1 ÷ total de la fila — verde/rojo contra la meta 2026, gris si no hay meta definida";
const EFFICIENCY_HINT = "In play ÷ Contacted — verde/rojo contra el benchmark, gris si hay muy pocos datos";
const GROUP_ORDER = ["Curated", "Mass", "Inbound", null] as const;
const GROUP_HINT: Record<"Curated" | "Mass" | "Inbound", string> = {
  Curated: "Contacto personal/curado: referrals, eventos, LinkedIn manual",
  Mass: "Alcance masivo automatizado: mass mailing, LinkedIn masivo (Maru)",
  Inbound: "Llegaron solos: social media, newsletter, búsqueda — Attio no distingue la plataforma exacta todavía",
};

/** Pipeline stages shown as their own columns — "Invested" is dropped from the table (still used elsewhere). */
const DISPLAYED_STAGES: PipelineStatus[] = PIPELINE_ORDER.filter((stage) => stage !== "Invested");

const COLUMN_COUNT = 1 + DISPLAYED_STAGES.length + 3;
const OUTCOME_BG = "var(--column-band)";

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

/** Tier 1 ÷ total, colored against this row's 2026 goal rate — gray when no goal is defined for the row. */
function Tier1Pct({
  tier1,
  total,
  tier1Goal,
  goalBase,
}: {
  tier1: number;
  total: number;
  tier1Goal: number | null;
  goalBase: number | null;
}) {
  const p = pct(tier1, total);
  if (p === null) return <span className="text-[var(--text-muted)]">—</span>;
  const target = tier1Goal !== null && goalBase !== null && goalBase !== 0 ? Math.round((tier1Goal / goalBase) * 100) : null;
  const { color, bg } =
    target === null
      ? { color: "var(--text-secondary)", bg: "var(--gridline)" }
      : p >= target
        ? { color: "var(--status-good)", bg: "var(--pill-good-bg)" }
        : { color: "var(--status-critical)", bg: "var(--pill-critical-bg)" };
  return (
    <span
      className="inline-flex cursor-help rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, background: bg }}
      title={target !== null ? `Meta: ${target}%` : "Meta pendiente"}
    >
      {p}%
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
      {DISPLAYED_STAGES.map((stage) => (
        <Fragment key={stage}>
          <td
            className="px-3 py-2.5 text-center tabular-nums text-[var(--text-primary)]"
            style={isTotal ? { fontWeight: 600 } : undefined}
          >
            {row.stageCounts[stage]}
          </td>
          {stage === "In play" && (
            <td
              className="px-3 py-2.5 text-center tabular-nums text-[var(--text-primary)]"
              style={isTotal ? { fontWeight: 600 } : undefined}
            >
              {row.tier1}
            </td>
          )}
        </Fragment>
      ))}
      <td
        className="border-l border-[var(--gridline)] px-3 py-2.5 text-center tabular-nums"
        style={{ background: OUTCOME_BG, ...(isTotal ? { fontWeight: 600 } : {}) }}
      >
        <EfficiencyPct contacted={row.stageCounts.Contacted} inPlay={row.stageCounts["In play"]} />
      </td>
      <td
        className="px-3 py-2.5 text-center tabular-nums text-[var(--text-primary)]"
        style={{ background: OUTCOME_BG, ...(isTotal ? { fontWeight: 600 } : {}) }}
      >
        <Tier1Pct
          tier1={row.tier1}
          total={row.total}
          tier1Goal={showGoals ? row.tier1Goal : null}
          goalBase={showGoals ? row.goal : null}
        />
      </td>
    </tr>
  );
}

const NO_OWNER = "Sin owner";

export function FunnelTable({ deals, showGoals = false }: { deals: Deal[]; showGoals?: boolean }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedOwner, setSelectedOwner] = useState("all");

  const owners = Array.from(new Set(deals.map((d) => d.owner ?? NO_OWNER))).sort((a, b) =>
    a === NO_OWNER ? 1 : b === NO_OWNER ? -1 : a.localeCompare(b)
  );
  const scopedDeals =
    selectedOwner === "all" ? deals : deals.filter((d) => (d.owner ?? NO_OWNER) === selectedOwner);

  const rows = buildFunnelMatrix(scopedDeals);
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
      subtitle={`Conversión acumulada por etapa · ${scopedDeals.length} deals`}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="owner-filter">
          Owner
        </label>
        <select
          id="owner-filter"
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          <option value="all">Todos</option>
          {owners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </div>
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
              {DISPLAYED_STAGES.map((stage) => (
                <Fragment key={stage}>
                  <th
                    title={STAGE_HINT[stage]}
                    className="cursor-help px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                  >
                    {stage}
                  </th>
                  {stage === "In play" && (
                    <th
                      title={TIER1_COUNT_HINT}
                      className="cursor-help px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                    >
                      Tier 1
                    </th>
                  )}
                </Fragment>
              ))}
              <th
                title={EFFICIENCY_HINT}
                className="cursor-help border-l border-[var(--gridline)] px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                style={{ background: OUTCOME_BG }}
              >
                Efic. In play/Contacted
              </th>
              <th
                title={TIER1_PCT_HINT}
                className="cursor-help px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                style={{ background: OUTCOME_BG }}
              >
                Tier 1
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
                    {section.group ?? "Other"}
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
        murieron, contando hasta dónde llegaron antes de caer. La columna Tier 1 entre &ldquo;In
        play&rdquo; y &ldquo;Pre-committee&rdquo; es el total de startups Tier 1 en la fila. Efic. In
        play/Contacted y Tier 1 (fondo resaltado, a la derecha) son porcentajes sobre el total de la
        fila; con menos de {MIN_SAMPLE_FOR_EFFICIENCY} contactadas, la eficiencia se muestra en gris
        (&ldquo;n bajo&rdquo;) porque no es una tasa fiable todavía.
        Curated / Mass / Inbound son una agrupación direccional nuestra (no un dato de Attio):
        Curated = contacto personal (referrals, eventos, LinkedIn manual), Mass = alcance masivo
        automatizado (mass mailing, LinkedIn vía Maru), Inbound = llegaron solos — Attio no
        distingue todavía si fue newsletter, LinkedIn, Instagram o web, todo cae en el mismo valor.
        En Inbound y Other, cuando hay más de una fuente distinta se muestran directamente
        como filas separadas. En el resto de filas, el ▸ indica que mezclan más de una fuente — haz
        clic para desglosarlas.
        {showGoals && (
          <>
            {" "}
            La barrita junto al nombre del canal es el objetivo 2026 (deals conseguidos ÷ meta). En
            el Tier 1 de la derecha, el % en verde o rojo es contra la meta 2026 de esa fila (verde =
            la igualamos o superamos, rojo = vamos por debajo). Los objetivos solo se muestran en
            &ldquo;Todos&rdquo; porque se definieron para Leads + Aplicaciones juntos.
          </>
        )}
      </p>
      <ChannelLegend />
    </ChartCard>
  );
}
