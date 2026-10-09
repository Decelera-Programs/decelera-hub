import type { Metadata } from "next";
import Link from "next/link";
import { HddDashboard } from "@/components/hdd/HddDashboard";
import { getHddDashboardData } from "@/lib/hdd/data";
import { requireMember } from "@/lib/hub";

export const metadata: Metadata = {
  title: "Human Due Diligence México 2026 | Decelera Hub",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireMember();
  const data = await getHddDashboardData();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> Decelera Hub
      </Link>
      <header className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Human Due Diligence México 2026
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Cómo son los founders y los equipos que han pasado por el programa: soft y hard skills,
            Legal Maze y bienestar (OLBI y BRS) antes y después.
          </p>
        </div>
      </header>
      <HddDashboard data={data} />
    </div>
  );
}
