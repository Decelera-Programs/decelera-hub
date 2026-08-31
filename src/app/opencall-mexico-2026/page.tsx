import type { Metadata } from "next";
import Link from "next/link";
import { FunnelDashboard } from "@/components/FunnelDashboard";
import { Header } from "@/components/Header";
import { getOpencallDeals } from "@/lib/data";

export const metadata: Metadata = {
  title: "Opencall México 2026 | Decelera Hub",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const deals = await getOpencallDeals();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> Decelera Hub
      </Link>
      <Header />
      <FunnelDashboard deals={deals} />
    </div>
  );
}
