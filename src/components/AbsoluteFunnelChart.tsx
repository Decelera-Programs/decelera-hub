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
  return { description: stage.description, lines: stage.extraLines ?? [] };
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

export function AbsoluteFunnelChart({ deals, showGoal }: { deals: Deal[]; showGoal: boolean }) {
  const { stages, total, selectedGoal } = buildAbsoluteFunnel(deals);
  // "Aplicaciones" ya no es una fila propia: se dibuja como el tramo relleno de la barra de
  // "Leads Contacted" para dejar claro que es un subconjunto del total, no una etapa aparte.
  const appCount = stages.find((s) => s.key === "Aplicaciones")?.count ?? 0;
  const rows = stages.filter((s) => s.key !== "Aplicaciones");
  const appPct = total > 0 ? Math.round((appCount / total) * 100) : 0;

  return (
    <ChartCard title="Funnel — supervivencia absoluta" subtitle="¿Cuántos avanzan en cada gate?">
      <div className="flex flex-col gap-3">
        {rows.map((stage, index) => {
          const isContacted = stage.key === "Leads Contacted";
          const widthPct = total > 0 ? Math.max((stage.count / total) * 100, stage.count > 0 ? 6 : 0) : 0;
          const isSelected = stage.key === "Invested";
          const tooltip = stageTooltipContent(stage);
          const prevStage = index > 0 ? rows[index - 1] : null;
          // % de la derecha: "Cualificadas" se mide sobre las aplicaciones (no sobre el total de
          // contactados); el resto de gates, sobre la etapa inmediatamente anterior.
          const pctBase = stage.key === "Qualified" ? appCount : (prevStage?.count ?? 0);
          const pctBaseLabel = stage.key === "Qualified" ? "aplicaciones" : (prevStage?.label.toLowerCase() ?? "");

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[var(--text-secondary)]">{stage.label}</span>
              <div className="group relative flex-1 cursor-help">
                <div className="relative flex h-9 overflow-hidden rounded-lg" style={{ background: "var(--gridline)" }}>
                  {isContacted ? (
                    <>
                      <div
                        className="flex h-full items-center px-3 text-sm font-semibold text-white"
                        style={{ width: `${appPct}%`, background: "var(--series-1)" }}
                        title={`Aplicaciones: ${appCount}`}
                      >
                        {appCount}
                      </div>
                      <div
                        className="flex h-full flex-1 items-center justify-end px-3 text-sm font-semibold"
                        style={{ background: "var(--series-other)", color: "var(--text-primary)" }}
                        title={`Leads sin aplicar: ${total - appCount}`}
                      >
                        {total - appCount}
                      </div>
                    </>
                  ) : (
                    <div
                      className="flex h-full items-center rounded-lg px-3 text-sm font-semibold text-white"
                      style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, var(--series-1), var(--series-2))" }}
                    >
                      {stage.count}
                    </div>
                  )}
                </div>
                <HoverTooltip description={tooltip.description} lines={tooltip.lines} />
              </div>
              <span className="w-32 shrink-0 text-right text-xs leading-tight">
                {isContacted ? (
                  <span className="text-[var(--text-muted)]">
                    {total} en total · {appPct}% aplican
                  </span>
                ) : isSelected && showGoal ? (
                  <span
                    className="font-medium"
                    style={{ color: stage.count >= selectedGoal ? "var(--status-good)" : "var(--status-critical)" }}
                  >
                    {stage.count} / {selectedGoal} plazas
                  </span>
                ) : prevStage === null ? (
                  <span className="text-[var(--text-muted)]">base</span>
                ) : (
                  <span className="text-[var(--text-muted)]">
                    {pctBase > 0 ? Math.round((stage.count / pctBase) * 100) : 0}% de {pctBaseLabel}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 border-t border-[var(--gridline)] pt-2 text-xs text-[var(--text-secondary)]">
        <span className="flex items-start gap-1.5">
          <span aria-hidden className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: "var(--series-1)" }} />
          <span>
            <strong>Aplicaciones</strong> — de los contactados, los que rellenaron el formulario de
            aplicación o tuvieron una videollamada con el equipo de inversión.
          </span>
        </span>
        <span className="flex items-start gap-1.5">
          <span aria-hidden className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: "var(--series-other)" }} />
          <span>
            <strong>Leads sin aplicar</strong> — el resto de contactados: sourcing / outreach que
            nunca llegó a interactuar con el equipo.
          </span>
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        La primera barra es el total de leads contactados, partida en aplicaciones (azul) y leads sin
        aplicar (gris). De ahí hacia abajo, cada barra es cuántos llegaron a esa etapa o más allá, en
        número (no %), para no esconder el colapso real del embudo. Pasa el cursor sobre una barra
        para ver su descripción y desglose.
      </p>
    </ChartCard>
  );
}
