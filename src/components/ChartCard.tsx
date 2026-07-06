import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-4 p-6 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
