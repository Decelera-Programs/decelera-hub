import { CONVERSION_ROWS, ROW_SOURCE_HINT } from "@/lib/aggregate";
import { ROW_COLOR } from "@/lib/colors";

/** One entry per row of the conversion table, describing which raw `reference_3` values feed it — same order, same colours as the table. */
export function ChannelLegend() {
  return (
    <dl className="flex flex-col gap-2 border-t border-[var(--gridline)] pt-3 text-xs sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
      {CONVERSION_ROWS.map((def) => (
        <div key={def.key} className="flex items-start gap-1.5">
          <span
            aria-hidden
            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: ROW_COLOR[def.key] }}
          />
          <dt className="font-medium text-[var(--text-secondary)]">{def.label}:</dt>
          <dd className="text-[var(--text-muted)]">{ROW_SOURCE_HINT[def.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
