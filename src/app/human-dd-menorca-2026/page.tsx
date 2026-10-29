import type { Metadata } from "next";
import Link from "next/link";
import { MenorcaDashboard } from "@/components/hdd-menorca/MenorcaDashboard";
import { requireMember } from "@/lib/hub";
import { getMenorcaDashboardData } from "@/lib/hdd-menorca/data";

export const metadata: Metadata = {
  title: "Human Due Diligence Menorca 2026 | Decelera Brain",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireMember();
  const data = await getMenorcaDashboardData();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> Decelera Brain
      </Link>
      <header className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Human Due Diligence Menorca 2026
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Todo el dato de la Human DD de Menorca 2026: soft y hard skills, Legal Maze, bienestar (OLBI y BRS) antes
            y después, y retos. Individual por founder y de equipo por startup.
          </p>
        </div>
      </header>
      <MenorcaDashboard data={data} />
    </div>
  );
}
