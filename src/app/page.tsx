import { FunnelDashboard } from "@/components/FunnelDashboard";
import { Header } from "@/components/Header";
import { getOpencallDeals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const deals = await getOpencallDeals();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Header />
      <FunnelDashboard deals={deals} />
    </div>
  );
}
