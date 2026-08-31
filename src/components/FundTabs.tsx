import Link from "next/link";
import { FUNDS, FUND_META, type Fund } from "@/lib/kpis";

export function FundTabs({ active }: { active: Fund }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Fondo">
      {FUNDS.map((fund) => {
        const meta = FUND_META[fund];
        return (
          <Link
            key={fund}
            href={`/motor-operativo/${fund}`}
            role="tab"
            aria-selected={active === fund}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              active === fund
                ? "border-[var(--brand-sea)] bg-[var(--brand-sea)] text-white"
                : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--row-hover)]"
            }`}
          >
            {meta.label}
          </Link>
        );
      })}
    </div>
  );
}
