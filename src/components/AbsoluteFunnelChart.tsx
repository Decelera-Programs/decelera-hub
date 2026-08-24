import { ChartCard } from "./ChartCard";
import { buildAbsoluteFunnel } from "@/lib/aggregate";
import type { AbsoluteFunnelStage } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

/** Builds the hover breakdown for a stage — always sums back to `stage.count`. Null when the stage has none. */
function stageTooltipContent(stage: AbsoluteFunnelStage, gateOut: boolean): { header: string; lines: string[] } | null {
  if (stage.appBreakdown) {
    const { progressed, killedDidNotAnswer, killedNotInterested, killedOtherReason, notQualified, pending } =
      stage.appBreakdown;
    const deadOnArrival = killedDidNotAnswer + killedNotInterested + killedOtherReason + notQualified;

    if (gateOut) {
      // `stage.count` here already excludes dead-on-arrival leads (progressed + pending only) —
      // the header/lines below match that same subset, not the raw total.
      return {
        header: `${stage.count} aplicaciones activas (todos los canales) se dispersan así:`,
        lines: [
          `${progressed} avanzaron a Qualified o más allá`,
          `${pending} siguen en Contacted, sin resolver`,
          `(${deadOnArrival} quedaron fuera de este total: Killed/No calificados sin haber avanzado nunca de Contacted)`,
        ],
      };
    }

    const rawTotal = progressed + deadOnArrival + pending;
    return {
      header: `${rawTotal} aplicaciones (todos los canales) se dispersan así:`,
      lines: [
        `${progressed} avanzaron a Qualified o más allá`,
        `${killedDidNotAnswer} Killed — no respondieron ("Did not answer")`,
        `${killedNotInterested} Killed — no interesados ("Not interested")`,
        `${killedOtherReason} Killed — otro motivo / sin razón registrada`,
        `${notQualified} No calificados ("Not qualified")`,
        `${pending} siguen en Contacted, sin resolver`,
      ],
    };
  }
  if (stage.breakdown) {
    const { currentlyHere, toReconnect, advancedFurther, diedAfterReaching } = stage.breakdown;
    return {
      header: `${stage.count} llegaron a "${stage.label}" o más allá:`,
      lines: [
        `${currentlyHere} actualmente en ${stage.label} (llamadas)`,
        `${toReconnect} a reconectar más adelante (razón de reconexión en Attio)`,
        `${advancedFurther} avanzaron a una etapa posterior`,
        `${diedAfterReaching} llegaron aquí pero luego fueron Killed / No calificados`,
      ],
    };
  }
  return null;
}

function HoverTooltip({ header, lines }: { header: string; lines: string[] }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-72 rounded-lg border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <p className="mb-1 font-semibold">{header}</p>
      <ul className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function AbsoluteFunnelChart({
  deals,
  showGoal,
  gateOut = false,
}: {
  deals: Deal[];
  showGoal: boolean;
  gateOut?: boolean;
}) {
  const { stages, total, selectedGoal } = buildAbsoluteFunnel(deals, { excludeDeadOnArrival: gateOut });

  return (
    <ChartCard
      title="Funnel — supervivencia absoluta"
      subtitle={gateOut ? "¿Cuántos avanzan en cada gate?" : "¿Dónde se cae la gente de verdad?"}
    >
      <div className="flex flex-col gap-3">
        {stages.map((stage, index) => {
          const widthPct = total > 0 ? Math.max((stage.count / total) * 100, stage.count > 0 ? 6 : 0) : 0;
          const isSelected = stage.key === "Invested";
          const tooltip = stageTooltipContent(stage, gateOut);
          const prevStage = index > 0 ? stages[index - 1] : null;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{stage.label}</span>
              <div className={`group relative flex-1 ${tooltip ? "cursor-help" : ""}`}>
                <div className="relative h-9 overflow-hidden rounded-lg" style={{ background: "var(--gridline)" }}>
                  <div
                    className="flex h-full items-center rounded-lg px-3 text-sm font-semibold text-white"
                    style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, var(--series-1), var(--series-2))" }}
                  >
                    {stage.count}
                  </div>
                </div>
                {tooltip && <HoverTooltip header={tooltip.header} lines={tooltip.lines} />}
              </div>
              <span className="w-28 shrink-0 text-right text-xs">
                {gateOut ? (
                  prevStage === null ? (
                    <span className="text-[var(--text-muted)]">base</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">
                      {stage.count} de {prevStage.count}
                    </span>
                  )
                ) : stage.dropPct === null ? (
                  <span className="text-[var(--text-muted)]">—</span>
                ) : isSelected && showGoal ? (
                  <span
                    className="font-medium"
                    style={{ color: stage.count >= selectedGoal ? "var(--status-good)" : "var(--status-critical)" }}
                  >
                    {stage.count} / {selectedGoal} plazas
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">caída {stage.dropPct}%</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {gateOut
          ? "Cuántos de la etapa anterior avanzaron a esta, en número — pasa el cursor sobre una barra para ver cómo se reparte. \"Aplicaciones\" aquí excluye a quienes murieron (Killed/No calificados) sin haber avanzado nunca de Contacted — cuentan igual sin importar el canal (form, Maru, mass email...), pero no eran candidatos reales, así que no infla la base."
          : "Números absolutos, no % relativo a la etapa anterior — así no se esconde el colapso real del embudo."}
      </p>
    </ChartCard>
  );
}
