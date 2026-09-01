"use client";

import { Fragment, useEffect, useState } from "react";
import { ChannelLegend } from "./ChannelLegend";
import { ChartCard } from "./ChartCard";
import { buildFunnelMatrix, CHANNEL_EFFICIENCY_BENCHMARK_PCT, MIN_SAMPLE_FOR_EFFICIENCY } from "@/lib/aggregate";
import type { FunnelMatrixRow } from "@/lib/aggregate";
import { ROW_COLOR } from "@/lib/colors";
import type { Deal } from "@/lib/types";

/**
 * Table columns. "Entrada" fusiona Leads Contacted + Aplicaciones en una sola columna (dos
 * números) — son el tope de embudo, no cuentas garantizadas ≤ la siguiente (una startup puede
 * llegar a Cualificadas sin haber rellenado formulario ni tenido videollamada, vía revisión
 * manual). El resto sí es el mismo funnel acumulado, en el mismo orden, que "Funnel —
 * supervivencia absoluta" arriba.
 */
type TableStageKey = "Entrada" | "Qualified" | "InPlay" | "PreCommittee" | "ContractSigned";

interface TableStageDef {
  key: TableStageKey;
  label: string;
  hint: string;
}

const TABLE_STAGES: TableStageDef[] = [
  {
    key: "Entrada",
    label: "Entrada",
    hint: "Leads contactados · de ellos, cuántos son aplicación (formulario rellenado o videollamada) — toca/haz clic para el desglose",
  },
  { key: "Qualified", label: "Cualificadas", hint: "Pasó el primer filtro de calidad" },
  { key: "InPlay", label: "In play", hint: "En proceso activo de evaluación" },
  { key: "PreCommittee", label: "Pre-comité", hint: "Presentada al comité de inversión · incluye cuántas son Tier 1" },
  { key: "ContractSigned", label: "Contract Signed", hint: "Decelera invirtió y la participación en el programa está confirmada" },
];

/** Builds the "still pending vs. moved on" breakdown shown on hover over a row's Entrada cell. */
function contactedTooltipContent(row: FunnelMatrixRow): { header: string; lines: string[] } {
  const { pending, progressed, killedDidNotAnswer, killedNotInterested, killedOtherReason, notQualified } =
    row.applicationsBreakdown;
  return {
    header: `${row.stageCounts.Contacted} contactados · ${row.applications} aplicación (formulario o videollamada):`,
    lines: [
      `${pending} siguen en Contacted, sin avanzar todavía`,
      `${progressed} avanzaron a Qualified o más allá`,
      `${killedDidNotAnswer} Killed — no respondieron ("Did not answer")`,
      `${killedNotInterested} Killed — no interesados ("Not interested")`,
      `${killedOtherReason} Killed — otro motivo / sin razón registrada`,
      `${notQualified} No calificados ("Not qualified")`,
    ],
  };
}

/**
 * Tap/click to toggle the breakdown popover (not hover) — hover doesn't exist as an event on
 * touch devices, which is the most likely reason earlier hover-based versions of this never
 * showed up for some users. Positioned with `fixed` + a measured bounding rect so it's never
 * clipped by the table's `overflow-x-auto` scroll wrapper (that wrapper's CSS forces its
 * vertical overflow to clip too — a `position: fixed` popover isn't laid out against it).
 * Closes on an outside click/tap or Escape.
 */
function EntradaCell({
  row,
  isTotal,
}: {
  row: FunnelMatrixRow;
  isTotal: boolean;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltip = contactedTooltipContent(row);

  useEffect(() => {
    if (!rect) return;
    function close() {
      setRect(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    // Skip the click that just opened it — otherwise the same event bubbling to
    // document closes it immediately.
    const id = requestAnimationFrame(() => {
      document.addEventListener("click", close);
      document.addEventListener("touchstart", close);
    });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("click", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [rect]);

  return (
    <td
      className="relative cursor-pointer px-3 py-2.5 text-center tabular-nums text-[var(--text-primary)] underline decoration-dotted underline-offset-4"
      style={isTotal ? { fontWeight: 600 } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        setRect((prev) => (prev ? null : e.currentTarget.getBoundingClientRect()));
      }}
    >
      <span className="tabular-nums">{row.stageCounts.Contacted}</span>
      <span className="text-[var(--text-muted)]"> · {row.applications} app</span>
      {rect && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-72 rounded-lg border px-3 py-2 text-left text-xs shadow-lg"
          style={{
            top: rect.bottom + 8,
            left: Math.min(rect.left, window.innerWidth - 300),
            background: "var(--surface-1)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <p className="mb-1 font-semibold">{tooltip.header}</p>
          <ul className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
            {tooltip.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </td>
  );
}

const TIER1_PCT_HINT = "Tier 1 ÷ total de la fila — verde/rojo contra la meta 2026, gris si no hay meta definida";
const EFFICIENCY_HINT = "In play ÷ Contacted — verde/rojo contra el benchmark, gris si hay muy pocos datos";
const GROUP_ORDER = ["Curated", "Mass", "Inbound", null] as const;
const GROUP_HINT: Record<"Curated" | "Mass" | "Inbound", string> = {
  Curated: "Contacto personal/curado: referrals, eventos, LinkedIn manual",
  Mass: "Alcance masivo automatizado: mass mailing, LinkedIn masivo (Maru)",
  Inbound: "Llegaron solos: social media, newsletter, búsqueda — Attio no distingue la plataforma exacta todavía",
};

const COLUMN_COUNT = 1 + TABLE_STAGES.length + 2;
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
          {ROW_COLOR[row.colorKey] && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: ROW_COLOR[row.colorKey] }}
            />
          )}
          {row.label}
          {showGoals && row.goal !== null && <GoalIndicator current={row.total} goal={row.goal} />}
        </span>
      </td>
      {TABLE_STAGES.map((stage) => {
        if (stage.key === "Entrada") return <EntradaCell key={stage.key} row={row} isTotal={isTotal} />;

        const value =
          stage.key === "Qualified"
            ? row.stageCounts.Qualified
            : stage.key === "InPlay"
              ? row.stageCounts["In play"]
              : stage.key === "PreCommittee"
                ? row.stageCounts["Pre-committee"]
                : row.investedConfirmed;

        return (
          <td
            key={stage.key}
            className="px-3 py-2.5 text-center tabular-nums text-[var(--text-primary)]"
            style={isTotal ? { fontWeight: 600 } : undefined}
          >
            {value}
            {stage.key === "PreCommittee" && (
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">({row.tier1} Tier 1)</span>
            )}
          </td>
        );
      })}
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
              {TABLE_STAGES.map((stage) => (
                <th
                  key={stage.key}
                  title={stage.hint}
                  className="cursor-help px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                >
                  {stage.label}
                </th>
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
        &ldquo;Entrada&rdquo; junta dos números: leads contactados alguna vez, y de ellos cuántos
        son aplicación (formulario rellenado o videollamada) — es el tope de embudo, no una etapa
        del funnel: una startup puede llegar a &ldquo;Cualificadas&rdquo; sin ser aplicación (el
        equipo la movió a mano tras revisarla), así que &ldquo;Cualificadas&rdquo; no tiene por qué
        ser menor o igual que la parte de aplicación de &ldquo;Entrada&rdquo;. Toca o haz clic en la
        celda para ver cuántas de esa fila siguen en Contacted sin avanzar todavía, frente a las que
        ya progresaron o murieron (y por qué). De &ldquo;Cualificadas&rdquo; en adelante sí son las
        mismas etapas, en el mismo orden, que el &ldquo;Funnel — supervivencia absoluta&rdquo; de
        arriba. Cada celda cuenta startups que llegaron a esa etapa o más
        allá — incluye a las que después murieron, contando hasta dónde llegaron antes de caer.
        Esto significa que, por ejemplo, las startups de Maru que llegaron a &ldquo;In
        play&rdquo; ya están incluidas dentro del &ldquo;In play&rdquo; de la fila Total — no hace
        falta sumarlas aparte. La cifra entre paréntesis en &ldquo;Pre-comité&rdquo;
        es el total de startups Tier 1 de la fila. Efic. In play/Contacted y Tier 1 (fondo
        resaltado, a la derecha) son porcentajes sobre el total de la fila; con menos de{" "}
        {MIN_SAMPLE_FOR_EFFICIENCY} contactadas, la eficiencia se muestra en gris (&ldquo;n
        bajo&rdquo;) porque no es una tasa fiable todavía.
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
