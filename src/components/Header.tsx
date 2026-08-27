/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";
import { CustomerJourneyButton } from "./CustomerJourneyButton";

const NAV_LINK_CLASS =
  "inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--row-hover)]";

export type PageKey =
  | "hub"
  | "europe"
  | "menorca-26"
  | "americas"
  | "operational"
  | "opencall-mexico"
  | "maru";

const BACK_LINKS: Record<PageKey, { label: string; href: string }[]> = {
  hub: [],
  europe: [{ label: "← Panel de control", href: "/" }],
  "menorca-26": [{ label: "← Decelera Europe", href: "/europe" }],
  americas: [{ label: "← Panel de control", href: "/" }],
  operational: [{ label: "← Panel de control", href: "/" }],
  "opencall-mexico": [
    { label: "← Americas", href: "/americas" },
    { label: "← Operational", href: "/operational" },
    { label: "Canal Maru", href: "/maru" },
  ],
  maru: [
    { label: "← Operational", href: "/operational" },
    { label: "Opencall México 2026", href: "/opencall-mexico" },
  ],
};

export function Header({
  active,
  title,
  subtitle,
  showCustomerJourney = true,
}: {
  active: PageKey;
  title: string;
  subtitle?: ReactNode;
  showCustomerJourney?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="max-w-2xl text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {BACK_LINKS[active].map((item) => (
          <Link key={item.href} href={item.href} className={NAV_LINK_CLASS}>
            {item.label}
          </Link>
        ))}
        {showCustomerJourney && <CustomerJourneyButton />}
      </div>
    </header>
  );
}
