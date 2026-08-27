import Link from "next/link";
import { CATEGORIES, CATEGORY_META } from "@/lib/dashboards";

export function CategoryPicker() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {CATEGORIES.map((category) => {
        const meta = CATEGORY_META[category];
        return (
          <Link
            key={category}
            href={`/${category}`}
            className="card flex flex-col gap-2 p-6 shadow-sm transition-colors hover:bg-[var(--row-hover)]"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {meta.subtitle}
            </span>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{meta.title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{meta.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
