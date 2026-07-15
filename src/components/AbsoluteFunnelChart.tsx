import { ChartCard } from "./ChartCard";
import { buildAbsoluteFunnel } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

export function AbsoluteFunnelChart({ deals, showGoal }: { deals: Deal[]; showGoal: boolean }) {
  const { stages, total, selectedGoal } = buildAbsoluteFunnel(deals);

  return (
    <ChartCard title="Funnel — supervivencia absoluta" subtitle="¿Dónde se cae la gente de verdad?">
      <div className="flex flex-col gap-3">
        {stages.map((stage) => {
          const widthPct = total > 0 ? Math.max((stage.count / total) * 100, stage.count > 0 ? 6 : 0) : 0;
          const isSelected = stage.key === "Invested";

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{stage.label}</span>
              <div className="relative h-9 flex-1 overflow-hidden rounded-lg" style={{ background: "var(--gridline)" }}>
                <div
                  className="flex h-full items-center rounded-lg px-3 text-sm font-semibold text-white"
                  style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, var(--series-1), var(--series-2))" }}
                >
                  {stage.count}
                </div>
              </div>
              <span className="w-28 shrink-0 text-right text-xs">
                {stage.dropPct === null ? (
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
        Números absolutos, no % relativo a la etapa anterior — así no se esconde el colapso real del embudo.
      </p>
    </ChartCard>
  );
}
