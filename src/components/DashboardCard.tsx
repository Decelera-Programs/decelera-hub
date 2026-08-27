import Link from "next/link";
import type { DashboardEntry } from "@/lib/dashboards";

export function DashboardCard({ entry }: { entry: DashboardEntry }) {
  const body = (
    <div className="card flex h-full flex-col gap-2 p-5 shadow-sm transition-colors hover:bg-[var(--row-hover)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{entry.name}</h3>
        {entry.comingSoon && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
            style={{ background: "var(--column-band)" }}
          >
            Próximamente
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{entry.description}</p>
    </div>
  );

  if (entry.comingSoon) {
    return <div className="opacity-60">{body}</div>;
  }

  if (entry.external) {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }

  return <Link href={entry.href}>{body}</Link>;
}
