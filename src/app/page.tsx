import { CategoryPicker } from "@/components/CategoryPicker";
import { Header } from "@/components/Header";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="hub"
        title="Panel de control"
        subtitle="Elige un área y después el dashboard que quieres consultar."
        showCustomerJourney={false}
      />
      <CategoryPicker />
    </div>
  );
}
