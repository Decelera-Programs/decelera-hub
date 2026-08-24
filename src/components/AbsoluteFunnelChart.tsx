import { ChartCard } from "./ChartCard";
import { buildAbsoluteFunnel } from "@/lib/aggregate";
import type { AbsoluteFunnelStage } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

/** Explains a stage's cumulative count on hover — always sums back to `stage.count`. */
function StageBreakdownTooltip({ stage }: { stage: AbsoluteFunnelStage }) {
  if (!stage.breakdown) return null;
  const { currentlyHere, toReconnect, advancedFurther, diedAfterReaching } = stage.breakdown;
  const lines = [
    `${currentlyHere} actualmente en ${stage.label} (llamadas)`,
    `${toReconnect} a reconectar más adelante (razón de reconexión en Attio)`,
    `${advancedFurther} avanzaron a una etapa posterior`,
    `${diedAfterReaching} llegaron aquí pero luego fueron Killed / No calificados`,
  ];
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-72 rounded-lg border px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <p className="mb-1 font-semibold">
        {stage.count} llegaron a &ldquo;{stage.label}&rdquo; o más allá:
      </p>
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
  const { stages, total, selectedGoal } = buildAbsoluteFunnel(deals);

  return (
    <ChartCard
      title="Funnel — supervivencia absoluta"
      subtitle={gateOut ? "¿Qué % avanza en cada gate?" : "¿Dónde se cae la gente de verdad?"}
    >
      <div className="flex flex-col gap-3">
        {stages.map((stage) => {
          const widthPct = total > 0 ? Math.max((stage.count / total) * 100, stage.count > 0 ? 6 : 0) : 0;
          const isSelected = stage.key === "Invested";

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{stage.label}</span>
              <div className={`group relative flex-1 ${stage.breakdown ? "cursor-help" : ""}`}>
                <div className="relative h-9 overflow-hidden rounded-lg" style={{ background: "var(--gridline)" }}>
                  <div
                    className="flex h-full items-center rounded-lg px-3 text-sm font-semibold text-white"
                    style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, var(--series-1), var(--series-2))" }}
                  >
                    {gateOut && stage.gatePct !== null ? `${stage.gatePct}%` : stage.count}
                  </div>
                </div>
                <StageBreakdownTooltip stage={stage} />
              </div>
              <span className="w-28 shrink-0 text-right text-xs">
                {gateOut ? (
                  stage.gatePct === null ? (
                    <span className="text-[var(--text-muted)]">base</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">
                      {stage.count} de {stages[stages.indexOf(stage) - 1].count}
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
          ? "% de la etapa anterior que avanzó a esta (\"gate out rate\") — mide la eficiencia de cada filtro, no la supervivencia total desde el inicio."
          : "Números absolutos, no % relativo a la etapa anterior — así no se esconde el colapso real del embudo."}
      </p>
    </ChartCard>
  );
}
