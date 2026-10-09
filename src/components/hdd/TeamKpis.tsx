import { ChartCard } from "@/components/ChartCard";
import type { StartupHdd } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import { EVENTS, EVENT_SHORT, fmt, TEAM_KEYS, TEAM_LABEL } from "./labels";

export function TeamKpis({ startup }: { startup: StartupHdd }) {
  const rows = TEAM_KEYS.map((k) => ({ key: k, stat: startup.team[k] })).filter((r) => r.stat && r.stat.n > 0);
  return (
    <ChartCard title="Team KPIs" subtitle="Cómo funciona el equipo: valoración de 1 a 10 por los evaluadores">
      {rows.length === 0 ? (
        <Empty>Sin evaluaciones de equipo aún</Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(({ key, stat }) => (
            <li key={key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{TEAM_LABEL[key]}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {fmt(stat!.avg)}
                  <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">n={stat!.n}</span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${TEAM_LABEL[key]}: ${fmt(stat!.avg)} sobre 10`}
                className="h-2 w-full overflow-hidden rounded-full bg-[var(--column-band)]"
              >
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (stat!.avg / 10) * 100)}%`, background: "var(--series-1)" }} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {EVENTS.map((e) => `${EVENT_SHORT[e]} ${stat!.byEvent[e] ? fmt(stat!.byEvent[e]!.avg) : "—"}`).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
