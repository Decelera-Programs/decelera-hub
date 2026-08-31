export function SnapshotBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: "var(--pill-info-bg)", color: "var(--info-fg)" }}
    >
      {label}
    </span>
  );
}
