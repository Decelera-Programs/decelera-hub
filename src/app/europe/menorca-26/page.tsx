import { DashboardCard } from "@/components/DashboardCard";
import { Header } from "@/components/Header";
import { CATEGORY_GROUPS } from "@/lib/dashboards";

export default function Menorca26Page() {
  const group = CATEGORY_GROUPS.europe?.find((g) => g.id === "menorca-26");
  const dashboards = group?.dashboards ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="menorca-26"
        title="Menorca 26"
        subtitle="Dashboards del programa Menorca 26."
        showCustomerJourney={false}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((entry) => (
          <DashboardCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
