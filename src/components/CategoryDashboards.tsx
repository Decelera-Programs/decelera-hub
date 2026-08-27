import { DashboardCard } from "./DashboardCard";
import { CATEGORY_DASHBOARDS, type Category } from "@/lib/dashboards";

export function CategoryDashboards({ category }: { category: Category }) {
  const entries = CATEGORY_DASHBOARDS[category];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <DashboardCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
