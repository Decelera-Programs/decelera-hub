import { CHANNEL_GOALS } from "@/lib/aggregate";
import { PIPELINE_ORDER } from "@/lib/transform";
import type { Deal } from "@/lib/types";

const TOTAL_GOAL = CHANNEL_GOALS.TOTAL;

/** % benchmark de conversión in play / total aplicaciones — pendiente de definir. */
const QUALITY_BENCHMARK_PCT: number | null = null;

function rank(stage: Deal["lastPipelineStage"]): number {
  return stage ? PIPELINE_ORDER.indexOf(stage) : -1;
}

function StatTile({
  label,
  value,
  caption,
  accent,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  accent: string;
  tone?: "positive" | "negative";
}) {
  const valueColor =
    tone === "positive" ? "var(--status-good)" : tone === "negative" ? "var(--status-critical)" : "var(--text-primary)";

  return (
    <div className="card flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="text-3xl font-semibold" style={{ color: valueColor }}>
        {value}
      </span>
      {caption && <span className="text-xs text-[var(--text-muted)]">{caption}</span>}
    </div>
  );
}

export function SummaryKpis({ deals, showGoal }: { deals: Deal[]; showGoal: boolean }) {
  const total = deals.length;

  const preComite = deals.filter((d) => d.status === "Pre-committee").length;
  const inPlay = deals.filter((d) => d.status === "In play").length;

  // Conversión acumulada: llegaron a "In play" o más allá (In play, Pre-committee, Invested),
  // no solo las que están hoy mismo en ese status.
  const inPlayOrBeyond = deals.filter((d) => rank(d.lastPipelineStage) >= rank("In play")).length;
  const qualityPct = total > 0 ? Math.round((inPlayOrBeyond / total) * 100) : null;

  // La meta (1171) se definió para Leads + Aplicaciones combinados — comparar un subset
  // filtrado por stage contra la meta completa daría una desviación falsa.
  const desvioPct = showGoal && total > 0 ? Math.round((total / TOTAL_GOAL - 1) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="En pre-comité" value={String(preComite)} accent="var(--series-2)" />
      <StatTile label="En in play" value={String(inPlay)} accent="var(--status-warning)" />
      <StatTile
        label="Calidad"
        value={qualityPct !== null ? `${qualityPct}%` : "—"}
        caption={QUALITY_BENCHMARK_PCT !== null ? `Benchmark: ${QUALITY_BENCHMARK_PCT}%` : "Benchmark pendiente"}
        accent="var(--series-1)"
      />
      <StatTile
        label="Desvío volumen"
        value={desvioPct !== null ? `${desvioPct > 0 ? "+" : ""}${desvioPct}%` : "—"}
        caption={showGoal ? `Meta: ${TOTAL_GOAL} aplicaciones` : "Solo disponible en vista Todos"}
        accent="var(--series-3)"
        tone={desvioPct === null ? undefined : desvioPct >= 0 ? "positive" : "negative"}
      />
    </div>
  );
}
