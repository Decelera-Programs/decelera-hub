/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CustomerJourneyButton } from "./CustomerJourneyButton";

const NAV_LINK_CLASS =
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors";

export function Header({ active = "dashboard" }: { active?: "dashboard" | "maru" }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Opencall México 2026
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Seguimiento del deal flow de Attio (stages <em>Mexico 2026</em> y{" "}
            <em>Leads Mexico 2026</em>): cuántas startups entran por cada canal y hasta dónde
            avanzan en el funnel.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {active === "maru" ? (
          <Link
            href="/"
            className={`${NAV_LINK_CLASS} border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]`}
          >
            ← Dashboard
          </Link>
        ) : (
          <Link
            href="/maru"
            className={`${NAV_LINK_CLASS} border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]`}
          >
            Canal Maru
          </Link>
        )}
        <CustomerJourneyButton />
      </div>
    </header>
  );
}
