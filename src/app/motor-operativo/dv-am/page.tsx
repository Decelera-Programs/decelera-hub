/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import {
  FUND_META,
  FUNDRAISING_KPIS,
  INVESTMENT_KPIS,
  MAIN_KPIS,
  MARKETING_VISITS_KPI,
  SNAPSHOT_DATE,
  SQUAD_KPIS,
} from "@/lib/kpis";
import { FundTabs } from "@/components/FundTabs";
import { InvestmentTile } from "@/components/InvestmentTile";
import { PendingTile } from "@/components/PendingTile";
import { SnapshotBadge } from "@/components/SnapshotBadge";
import { SquadSection } from "@/components/SquadSection";

export const metadata: Metadata = {
  title: "Control Panel | Decelera Hub",
};

export default function DvAmPage() {
  const meta = FUND_META["dv-am"];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> Decelera Hub
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Control Panel
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
              KPIs operativos de Decelera por fondo: DV-I (Menorca) y DV-AM (LATAM).
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {meta.label} · Datos al {SNAPSHOT_DATE}
            </p>
          </div>
        </div>
        <FundTabs active="dv-am" />
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Main KPIs</h2>
          <SnapshotBadge label="Snapshot manual · pendiente conexión Attio en vivo" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MAIN_KPIS["dv-am"].map((tile) => (
            <InvestmentTile key={tile.id} {...tile} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Investments</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INVESTMENT_KPIS["dv-am"].map((tile) => (
            <InvestmentTile key={tile.id} {...tile} />
          ))}
        </div>
      </section>

      <SquadSection title="Fundraising" tiles={FUNDRAISING_KPIS["dv-am"]} />

      <SquadSection title={SQUAD_KPIS.product.title} tiles={SQUAD_KPIS.product.tiles} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {SQUAD_KPIS.marketing.title}
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">(compartido entre fondos)</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InvestmentTile {...MARKETING_VISITS_KPI} />
          {SQUAD_KPIS.marketing.tiles.map((tile) => (
            <PendingTile key={tile.id} label={tile.label} description={tile.description} target={tile.target} />
          ))}
        </div>
      </section>
    </div>
  );
}
