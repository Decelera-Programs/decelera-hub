import Link from "next/link";
import type { Category, DashboardGroup } from "@/lib/dashboards";

export function GroupPicker({ category, groups }: { category: Category; groups: DashboardGroup[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <Link
          key={group.id}
          href={`/${category}/${group.id}`}
          className="card flex flex-col gap-2 p-5 shadow-sm transition-colors hover:bg-[var(--row-hover)]"
        >
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{group.name}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {group.dashboards.length} dashboard{group.dashboards.length === 1 ? "" : "s"}
          </p>
        </Link>
      ))}
    </div>
  );
}
