import { FunnelDashboard } from "@/components/FunnelDashboard";
import { Header } from "@/components/Header";
import { getOpencallDeals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OpencallMexicoPage() {
  const deals = await getOpencallDeals();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="opencall-mexico"
        title="Opencall México 2026"
        subtitle={
          <>
            Seguimiento del deal flow de Attio (stages <em>Mexico 2026</em> y{" "}
            <em>Leads Mexico 2026</em>): cuántas startups entran por cada canal y hasta dónde
            avanzan en el funnel.
          </>
        }
      />
      <FunnelDashboard deals={deals} />
    </div>
  );
}
