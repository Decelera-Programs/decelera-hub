import {
  buildBestChannelByQuality,
  buildBestChannelByVolume,
  buildBestSourcer,
  buildContactStatusCounts,
  CHANNEL_GOALS,
  isApplication,
} from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

const TOTAL_GOAL = CHANNEL_GOALS.TOTAL;

export function StatTile({
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

  const applicationsCount = deals.filter(isApplication).length;
  const tier1Count = deals.filter((d) => d.formScore.tier === "Tier 1").length;

  // La meta (1171) se definió para Leads + Aplicaciones combinados — comparar un subset
  // filtrado por stage contra la meta completa daría una desviación falsa.
  const desvioPct = showGoal && total > 0 ? Math.round((total / TOTAL_GOAL - 1) * 100) : null;

  const { videocallDone } = buildContactStatusCounts(deals);
  const bestVolume = buildBestChannelByVolume(deals);
  const bestQuality = buildBestChannelByQuality(deals);
  const bestSourcer = buildBestSourcer(deals);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Aplicaciones" value={String(applicationsCount)} caption="Formulario o videollamada hecha" accent="var(--series-1)" />
      <StatTile label="Tier 1" value={String(tier1Count)} caption={`de ${total} deals`} accent="var(--series-2)" />
      <StatTile
        label="Desvío volumen"
        value={desvioPct !== null ? `${desvioPct > 0 ? "+" : ""}${desvioPct}%` : "—"}
        caption={showGoal ? `Meta: ${TOTAL_GOAL} aplicaciones` : "Solo disponible en vista Todos"}
        accent="var(--series-3)"
        tone={desvioPct === null ? undefined : desvioPct >= 0 ? "positive" : "negative"}
      />
      <StatTile
        label="Founders interviewed"
        value={String(videocallDone)}
        caption='Contact Status = "Videocall Done" — solo cuenta videollamadas únicas, una por company'
        accent="var(--status-warning)"
      />
      <StatTile
        label="Mejor canal (volumen)"
        value={bestVolume?.label ?? "—"}
        caption={bestVolume ? `${bestVolume.count} deals` : "Sin datos"}
        accent="var(--series-1)"
      />
      <StatTile
        label="Mejor canal (calidad)"
        value={bestQuality?.label ?? "—"}
        caption={bestQuality ? `${bestQuality.count} Tier 1 (form o signals)` : "Sin datos"}
        accent="var(--series-2)"
      />
      <StatTile
        label="Mejor sourcer"
        value={bestSourcer?.name ?? "—"}
        caption={bestSourcer ? `${bestSourcer.count} deals · por owner` : "Sin datos"}
        accent="var(--series-3)"
      />
    </div>
  );
}
