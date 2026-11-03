function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card spotlight flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="text-3xl font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

/** Métricas de contexto de los últimos 7 días, derivadas de getEventCountsSince — ver FlowDiagram para
 * el mismo dato en forma de diagrama. */
export function MetricsRow({ counts }: { counts: Record<string, number> }) {
  const created = counts.attio_deal_created ?? 0;
  const merged = counts.attio_deal_merged ?? 0;
  const needsReview = counts.attio_needs_review ?? 0;
  const sent = (counts.first_reply_sent ?? 0) + (counts.approval_sent ?? 0);
  const total = created + merged;
  const manualPct = total > 0 ? Math.round((needsReview / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Leads esta semana" value={String(total)} accent="var(--series-1)" />
      <StatTile label="Correos enviados" value={String(sent)} accent="var(--series-2)" />
      <StatTile label="Necesitaron revisión" value={`${needsReview} (${manualPct}%)`} accent="var(--status-warning)" />
      <StatTile label="Leads ya conocidos" value={String(merged)} accent="var(--series-3)" />
    </div>
  );
}
