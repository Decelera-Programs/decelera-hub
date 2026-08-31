export function InvestmentTile({
  label,
  description,
  value,
  target,
  progress,
  thresholdOk,
}: {
  label: string;
  description: string;
  value: string;
  target?: string;
  /** 0-1 fill toward `target`, rendered as a progress bar. */
  progress?: number;
  /** For a floor-style target (e.g. "> 5%") — renders a pass/fail badge instead of a bar. */
  thresholdOk?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-[var(--text-primary)]">{value}</span>
        {target && <span className="text-sm text-[var(--text-secondary)]">de {target}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--column-band)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%`, background: "var(--brand-sea)" }}
          />
        </div>
      )}
      {thresholdOk !== undefined && (
        <span
          className="w-fit rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: thresholdOk ? "var(--pill-good-bg)" : "var(--pill-critical-bg)",
            color: thresholdOk ? "var(--status-good)" : "var(--status-critical)",
          }}
        >
          {thresholdOk ? "Por encima del objetivo" : "Por debajo del objetivo"}
        </span>
      )}
    </div>
  );
}
