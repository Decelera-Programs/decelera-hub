import { Header } from "@/components/Header";
import { MaruDashboard } from "@/components/MaruDashboard";
import { getOpencallDeals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MaruPage() {
  const deals = await getOpencallDeals();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header
        active="maru"
        title="Canal Maru"
        subtitle="Desglose del canal de outreach Maru dentro del dealflow de la opencall México 2026: KPIs, motivos de descarte y tasa de completitud del formulario."
      />
      <MaruDashboard deals={deals} />
    </div>
  );
}
