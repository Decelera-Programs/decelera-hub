import { CategoryDashboards } from "@/components/CategoryDashboards";
import { Header } from "@/components/Header";
import { CATEGORY_META } from "@/lib/dashboards";

export default function EuropePage() {
  const meta = CATEGORY_META.europe;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="europe"
        title={`${meta.title} — ${meta.subtitle}`}
        subtitle={meta.description}
        showCustomerJourney={false}
      />
      <CategoryDashboards category="europe" />
    </div>
  );
}
