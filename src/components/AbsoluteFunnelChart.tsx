import { ChartCard } from "./ChartCard";
import { buildAbsoluteFunnel } from "@/lib/aggregate";
import type { AbsoluteFunnelStage } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

/** Builds the hover content for a stage: its plain-English description, plus a numeric breakdown when one applies. */
function stageTooltipContent(stage: AbsoluteFunnelStage): { description: string; lines: string[] } {
  if (stage.appBreakdown) {
    const { progressed, killedDidNotAnswer, killedNotInterested, killedOtherReason, notQualified, pending } =
      stage.appBreakdown;
    return {
      description: stage.description,
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
      description: stage.description,
      lines: [
        `${currentlyHere} actualmente en ${stage.label} (llamadas)`,
        `${toReconnect} a reconectar más adelante (razón de reconexión en Attio)`,
        `${advancedFurther} avanzaron a una etapa posterior`,
        `${diedAfterReaching} llegaron aquí pero luego fueron Killed / No calificados`,
      ],
    };
  }
  return { description: stage.description, lines: [] };
}

function HoverTooltip({ description, lines }: { description: string; lines: string[] }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-72 rounded-lg border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <p className="mb-1.5">{description}</p>
      {lines.length > 0 && (
        <ul className="flex flex-col gap-0.5 border-t pt-1.5 text-[var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
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
  const { stages, total, selectedGoal } = buildAbsoluteFunnel(deals);

  return (
    <ChartCard
      title="Funnel — supervivencia absoluta"
      subtitle={gateOut ? "¿Cuántos avanzan en cada gate?" : "¿Dónde se cae la gente de verdad?"}
    >
      <div className="flex flex-col gap-3">
        {stages.map((stage, index) => {
          const widthPct = total > 0 ? Math.max((stage.count / total) * 100, stage.count > 0 ? 6 : 0) : 0;
          const isSelected = stage.key === "Invested";
          const tooltip = stageTooltipContent(stage);
          const prevStage = index > 0 ? stages[index - 1] : null;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{stage.label}</span>
              <div className="group relative flex-1 cursor-help">
                <div className="relative h-9 overflow-hidden rounded-lg" style={{ background: "var(--gridline)" }}>
                  <div
                    className="flex h-full items-center rounded-lg px-3 text-sm font-semibold text-white"
                    style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, var(--series-1), var(--series-2))" }}
                  >
                    {stage.count}
                  </div>
                </div>
                <HoverTooltip description={tooltip.description} lines={tooltip.lines} />
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
          ? "Cuántos de la etapa anterior avanzaron a esta, en número — pasa el cursor sobre una barra para ver su descripción y desglose."
          : "Números absolutos, no % relativo a la etapa anterior — así no se esconde el colapso real del embudo."}
      </p>
    </ChartCard>
  );
}
