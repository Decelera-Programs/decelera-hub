import { Header } from "@/components/Header";
import { MaruDashboard } from "@/components/MaruDashboard";
import { getOpencallDeals } from "@/lib/data";
import { requireMember } from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function MaruPage() {
  await requireMember();
  const deals = await getOpencallDeals();

  return (
    <div className="ambient mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Header active="maru" />
      <MaruDashboard deals={deals} />
    </div>
  );
}
