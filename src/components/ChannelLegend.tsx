import { CHANNEL_COLOR, CHANNEL_ORDER } from "@/lib/colors";
import { buildChannelSources } from "@/lib/transform";

export function ChannelLegend() {
  const sources = buildChannelSources();

  return (
    <dl className="flex flex-col gap-2 border-t border-[var(--gridline)] pt-3 text-xs sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
      {CHANNEL_ORDER.map((channel) => (
        <div key={channel} className="flex items-start gap-1.5">
          <span
            aria-hidden
            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: CHANNEL_COLOR[channel] }}
          />
          <dt className="font-medium text-[var(--text-secondary)]">{channel}:</dt>
          <dd className="text-[var(--text-muted)]">{sources[channel].join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}
