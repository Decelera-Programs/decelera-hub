export function PendingTile({
  label,
  description,
  target,
  badge = "Próximamente",
}: {
  label: string;
  description: string;
  target?: string;
  badge?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[20px] border border-dashed p-5"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{label}</h3>
        <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{badge}</span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
      {target && <p className="text-xs text-[var(--text-muted)]">Target: {target}</p>}
    </div>
  );
}
