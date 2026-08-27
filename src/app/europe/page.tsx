import { GroupPicker } from "@/components/GroupPicker";
import { Header } from "@/components/Header";
import { CATEGORY_GROUPS, CATEGORY_META } from "@/lib/dashboards";

export default function EuropePage() {
  const meta = CATEGORY_META.europe;
  const groups = CATEGORY_GROUPS.europe ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="europe"
        title={`${meta.title} — ${meta.subtitle}`}
        subtitle={meta.description}
        showCustomerJourney={false}
      />
      <GroupPicker category="europe" groups={groups} />
    </div>
  );
}
